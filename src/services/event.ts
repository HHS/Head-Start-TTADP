/* eslint-disable max-len */
import { Op, cast, WhereOptions as SequelizeWhereOptions } from 'sequelize';
import parse from 'csv-parse/lib/sync';
import {
  TRAINING_REPORT_STATUSES as TRS,
  REASONS,
  TARGET_POPULATIONS,
  EVENT_TARGET_POPULATIONS,
  EVENT_AUDIENCE,
} from '@ttahub/common';
import moment from 'moment';
import { auditLogger } from '../logger';
import db, { sequelize } from '../models';
import {
  EventShape,
  CreateEventRequest,
  UpdateEventRequest,
  SessionShape,
  TRAlertShape,
} from './types/event';
import EventReport from '../policies/event';
import { trEventComplete } from '../lib/mailer';
import { FILE_STATUSES } from '../constants';

const {
  EventReportPilot,
  SessionReportPilot,
  User,
  EventReportPilotNationalCenterUser,
  File,
} = db;

type WhereOptions = {
  id?: number;
  ownerId?: number;
  pocIds?: number;
  collaboratorIds?: number[];
  regionId?: number;
};

export const validateFields = (request, requiredFields) => {
  const missingFields = requiredFields.filter((field) => !request[field]);

  if (missingFields.length) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }
};

/**
 * Creates an event.
 *
 * @param {CreateEventRequest} request - The request data for creating the event.
 * @param {string} request.ownerId - The ID of the owner.
 * @param {string} request.pocIds - The ID of the point of contact.
 * @param {string[]} request.collaboratorIds - An array of IDs of collaborators.
 * @param {string} request.regionId - The ID of the region where the event will take place.
 * @param {unknown} request.data - The data associated with the event.
 *
 * @returns {Promise<EventShape>} A promise that resolves to the created event.
 *
 * @throws {Error} If any required fields are missing in the request data.
 */
export async function createEvent(request: CreateEventRequest): Promise<EventShape> {
  validateFields(request, ['ownerId', 'regionId', 'data']);

  const {
    ownerId,
    pocIds,
    collaboratorIds,
    regionId,
    data,
  } = request;

  return EventReportPilot.create({
    ownerId,
    pocIds,
    collaboratorIds,
    regionId,
    data: cast(JSON.stringify(data), 'jsonb'),
  });
}

/**
 * Deletes all training reports and an event report based on the provided event id.
 * @param id - The id of the event to be deleted
 * @returns - A promise that resolves when both records have been successfully deleted
 * @throws - Throws an error if either of the delete operations fail
 */
export async function destroyEvent(id: number): Promise<void> {
  try {
    auditLogger.info(`Deleting session reports for event ${id}`);
    await SessionReportPilot.destroy({ where: { eventId: id } });
  } catch (e) {
    auditLogger.error(`Error deleting session reports for event ${id}:`, e);
  }
  try {
    auditLogger.info(`Deleting event report for event ${id}`);
    await EventReportPilot.destroy({ where: { id } });
  } catch (e) {
    auditLogger.error(`Error deleting event report for event ${id}:`, e);
  }
}

export async function findEventHelper(where, plural = false): Promise<EventShape | EventShape[] | null> {
  const query = {
    attributes: [
      'id',
      'ownerId',
      'pocIds',
      'collaboratorIds',
      'regionId',
      'data',
      'updatedAt',
    ],
    where,
    include: [
      {
        model: EventReportPilotNationalCenterUser,
        as: 'eventReportPilotNationalCenterUsers',
      },
      {
        model: SessionReportPilot,
        include: [
          {
            required: false,
            model: File,
            as: 'supportingAttachments',
            where: {
              status: {
                [Op.ne]: FILE_STATUSES.UPLOAD_FAILED,
              },
            },
          },
        ],
        attributes: [
          'id',
          'eventId',
          'data',
          'createdAt',
          'updatedAt',
          'approverId',
          'submitted',
          // eslint-disable-next-line @typescript-eslint/quotes
          [sequelize.literal(`Date(NULLIF("SessionReportPilot".data->>'startDate',''))`), 'startDate'],
        ],
        as: 'sessionReports',
        separate: true, // This is required to order the joined table results.
        order: [['startDate', 'ASC'], ['data.sessionName', 'ASC'], ['createdAt', 'ASC']],
      },
    ],
  };

  const event = plural ? await EventReportPilot.findAll(query) : await EventReportPilot.findOne(query);

  if (!event) {
    return null;
  }

  if (Array.isArray(event)) {
    return event;
  }

  let { owner } = event.data;

  if (!owner) {
    if (event.ownerId) {
      const ownerUser = await User.findOne({
        where: { id: event.ownerId },
        attributes: [
          'name',
          'email',
          'id',
          'fullName',
        ],
        include: [
          {
            model: db.Role,
            as: 'roles',
          },
        ],
      });

      if (ownerUser) {
        owner = ownerUser.toJSON();
      }
    }
  }

  return {
    id: event?.id,
    ownerId: event?.ownerId,
    owner,
    pocIds: event?.pocIds,
    collaboratorIds: event?.collaboratorIds,
    regionId: event?.regionId,
    data: event?.data,
    updatedAt: event?.updatedAt,
    sessionReports: event?.sessionReports ?? [],
    eventReportPilotNationalCenterUsers: event?.eventReportPilotNationalCenterUsers ?? [],
  };
}

interface FindEventHelperBlobOptions {
  key: string;
  value: string;
  regions: number[] | undefined;
  fallbackValue?: string;
  allowNull?: boolean;
  scopes: SequelizeWhereOptions[];
}

export async function findEventHelperBlob({
  key,
  value,
  regions,
  fallbackValue,
  allowNull = false,
  scopes,
}: FindEventHelperBlobOptions): Promise<EventShape[]> {
  const getClause = () => {
    if (allowNull) {
      return {
        [Op.or]: [
          { [key]: value },
          { [key]: { [Op.eq]: null } },
        ],
      };
    }

    return { [key]: value };
  };

  let where: object = { data: { ...getClause() } };
  if (scopes) {
    where = {
      [Op.and]: scopes,
      ...where,
    };
  } else if (regions && regions.length) {
    // @ts-ignore
    where.regionId = regions;
  }

  const events = await EventReportPilot.findAll({
    attributes: [
      'id',
      'ownerId',
      'pocIds',
      'collaboratorIds',
      'regionId',
      'data',
    ],
    include: [
      {
        model: SessionReportPilot,
        as: 'sessionReports',
        separate: true, // This is required to order the joined table results.
        attributes: [
          'id',
          'eventId',
          'data',
          'createdAt',
          'updatedAt',
          'approverId',
          'submitted',
          // eslint-disable-next-line @typescript-eslint/quotes
          [sequelize.literal(`Date(NULLIF("SessionReportPilot".data->>'startDate',''))`), 'startDate'],
        ],
        order: [['startDate', 'ASC'], ['data.sessionName', 'ASC'], ['createdAt', 'ASC']],
      },
    ],
    where,
    order: [['data.eventId', 'ASC'], ['data.startDate', 'ASC']],
  });

  // if a fallbackValue was provided for this key search
  if (events && events.length && fallbackValue) {
    // if key is null or undefined, we assign its value to the fallback value
    return events.map((event) => {
      if (!event.data[key]) {
        // eslint-disable-next-line no-param-reassign
        event.data[key] = fallbackValue;
      }
      return event;
    });
  }

  // otherwise just return the events as-is, or null
  return events || null;
}

/**
 * Updates an existing event in the database or creates a new one if it doesn't exist.
 * @param request An object containing all fields to be updated for the event.
 *                Required fields: id, ownerId, pocIds, collaboratorIds, regionId, data.
 * @returns A Promise that resolves to the updated event.
 * @throws {Error} If the specified event does not exist and cannot be created.
 */
export async function updateEvent(id: number, request: UpdateEventRequest): Promise<EventShape> {
  const event = await EventReportPilot.findOne({
    where: { id },
  });

  if (!event) {
    return createEvent(request);
  }

  validateFields(request, ['ownerId', 'regionId', 'data']);

  const {
    ownerId,
    pocIds,
    collaboratorIds,
    regionId,
    data,
  } = request;

  const { status } = data;

  if (ownerId) {
    const newOwner = await User.findOne(
      {
        where: { id: ownerId },
        attributes: [
          'id',
          'fullName',
          'email',
          'name',
        ],
        include: [
          {
            model: db.Role,
            as: 'roles',
          },
        ],
      },
    );

    if (newOwner) {
      // update the owner in the data.
      data.owner = newOwner.toJSON();
    }
  }

  const evt = await EventReportPilot.findByPk(id);

  if (status === TRS.COMPLETE && event.status !== status) {
    // enqueue completion notification
    await trEventComplete(evt.toJSON());
  }

  await evt.update(
    {
      ownerId,
      pocIds,
      collaboratorIds,
      regionId,
      data: cast(JSON.stringify(data), 'jsonb'),
    },
    { where: { id }, individualHooks: true },
  );

  return findEventHelper({ id }) as Promise<EventShape>;
}

export async function findEventByDbId(id: number, scopes: WhereOptions[] = [{}]): Promise<EventShape | null> {
  const where = {
    [Op.and]: [
      { id },
      ...scopes,
    ],
  };
  return findEventHelper(where) as Promise<EventShape>;
}

const parseMinimalEventForAlert = (
  event: {
    id: number;
    ownerId: number;
    pocIds: number[];
    collaboratorIds: number[];
    data: {
      eventId: string;
      eventName: string;
      startDate: string;
      endDate: string;
      status: string;
    },
  },
  alertType: 'noSessionsCreated' | 'missingEventInfo' | 'missingSessionInfo' | 'eventNotCompleted',
  sessionName = '--',
) : TRAlertShape => ({
  id: event.id,
  eventId: event.data.eventId,
  eventName: event.data.eventName,
  alertType,
  sessionName,
  isSession: sessionName !== '--',
  sessionId: false,
  ownerId: event.ownerId,
  pocIds: event.pocIds,
  collaboratorIds: event.collaboratorIds,
  endDate: event.data.endDate,
  startDate: event.data.startDate,
  eventStatus: event.data.status,
});

// type for an array of either strings of functions that return a boolean
type TChecker = 'ownerComplete' | 'pocComplete';

const checkSessionForCompletion = (
  session: SessionShape,
  event: EventShape,
  checker: TChecker,
  missingSessionInfo: TRAlertShape[],
) => {
  // this checks to see if the session has been completed
  // with a lookup in the form data
  // by the owner or the poc (depending on the checker parameter)
  const sessionValid = !!(session.data[checker]);

  if (!sessionValid) {
    missingSessionInfo.push({
      id: session.id,
      eventId: event.data.eventId,
      isSession: true,
      sessionName: session.data.sessionName,
      eventName: event.data.eventName,
      alertType: 'missingSessionInfo',
      ownerId: event.ownerId,
      pocIds: event.pocIds,
      collaboratorIds: event.collaboratorIds,
      endDate: session.data.endDate,
      startDate: session.data.startDate,
      sessionId: session.id,
      eventStatus: event.data.status,
    });
  }
};

export async function getTrainingReportAlerts(
  userId: number | undefined,
  regions: number[] | undefined,
  where: SequelizeWhereOptions[] = [],
): Promise<TRAlertShape[]> {
  // get all events that the user is a part of and that are not complete/suspended
  const events = await findEventHelper({
    [Op.and]: [
      ...where,
      {
        ...(
          // we do not check regions.length here
          // because we want an empty array to apply
          regions
            ? { regionId: { [Op.in]: regions } }
            : {}
        ),
        data: {
          status: {
            [Op.notIn]: [TRS.COMPLETE, TRS.SUSPENDED],
          },
        },
      },
    ],
  }, true) as EventShape[];

  const alerts = [];

  // missingEventInfo: Missing event info (IST Creator or Collaborator) - 20 days past event start date
  // missingSessionInfo: Missing session info (IST Creator or Collaborator or POC) - 20 days past session start date
  // noSessionsCreated: No sessions created (IST Creator) - 20 days past event start date
  // eventNotCompleted: Event not completed (IST Creator or Collaborator) - 20 days past event end date

  const today = moment().startOf('day');

  // the following three filters are used to determine if the user is the owner, collaborator, or poc
  // or if there is no user, in which case the alert is triggered for everyone
  // this handles both cases: the alerts table in the UI and the email alerts for a given day
  const ownerUserIdFilter = (event: EventShape, user: number | undefined) => {
    if (!user || event.ownerId === user) {
      return true;
    }

    return false;
  };

  const collaboratorUserIdFilter = (event: EventShape, user: number | undefined) => {
    if (!user || event.collaboratorIds.includes(user)) {
      return true;
    }

    return false;
  };

  const pocUserFilter = (event: EventShape, user: number | undefined) => {
    if (!user || event.pocIds.includes(user)) {
      return true;
    }
    return false;
  };

  events.forEach((event: EventShape) => {
    const nineteenDaysAfterStart = moment(event.data.startDate).startOf('day').add(19, 'days');
    const nineteenDaysAfterEnd = moment(event.data.endDate).startOf('day').add(19, 'days');

    // one alert triggers just for the owner
    if (ownerUserIdFilter(event, userId)) {
      // if we are 20 days past the end date, and the event is not completed
      if (event.data.status !== TRS.COMPLETE && today.isAfter(nineteenDaysAfterEnd)) {
        alerts.push(parseMinimalEventForAlert(event, 'eventNotCompleted'));
      }
    }

    // some alerts only trigger for the owner or the collaborators
    if (ownerUserIdFilter(event, userId) || collaboratorUserIdFilter(event, userId)) {
      // if we are 20 days past the start date
      if (today.isAfter(nineteenDaysAfterStart)) {
        // or we are missing event data
        if (!event.data.eventSubmitted) {
          alerts.push(parseMinimalEventForAlert(event, 'missingEventInfo'));
        }
      }

      // if we are 20 days past the end date
      if (today.isAfter(nineteenDaysAfterStart) && event.sessionReports.length === 0) {
        // and there are no sessions
        alerts.push(parseMinimalEventForAlert(event, 'noSessionsCreated'));
      }

      const sessions = event.sessionReports.filter((session) => session.data.status !== TRS.COMPLETE);
      sessions.forEach((session) => {
        if (alerts.find((alert) => alert.isSession && alert.id === session.id)) return;
        const nineteenDaysAfterSessionStart = moment(session.data.startDate).startOf('day').add(19, 'days');
        if (today.isAfter(nineteenDaysAfterSessionStart)) {
          checkSessionForCompletion(session, event, 'ownerComplete', alerts);
        }
      });
    }

    // the other event triggers for everyone
    if (pocUserFilter(event, userId)) {
      const sessions = event.sessionReports.filter((session) => session.data.status !== TRS.COMPLETE);

      sessions.forEach((session) => {
        if (alerts.find((alert) => alert.isSession && alert.id === session.id)) return;
        const nineteenDaysAfterSessionStart = moment(session.data.startDate).startOf('day').add(19, 'days');
        if (today.isAfter(nineteenDaysAfterSessionStart)) {
        // eslint-disable-next-line no-restricted-syntax
          checkSessionForCompletion(session, event, 'pocComplete', alerts);
        }
      }); // for each session
    }
  }); // for each event

  return alerts;
}

export async function getTrainingReportAlertsForUser(
  userId: number,
  regions: number[],
): Promise<TRAlertShape[]> {
  const where = {
    [Op.or]: [
      {
        ownerId: userId,
      },
      {
        collaboratorIds: {
          [Op.contains]: [userId],
        },
      },
      {
        pocIds: {
          [Op.contains]: [userId],
        },
      },
    ],
  } as SequelizeWhereOptions;

  return getTrainingReportAlerts(userId, regions, [where]);
}

export async function findEventBySmartsheetIdSuffix(eventId: string, scopes: WhereOptions[] = [{}]): Promise<EventShape | null> {
  const where = {
    [Op.and]: [
      {
        data: {
          eventId: {
            [Op.endsWith]: `-${eventId}`,
          },
        },
      },
      ...scopes,
    ],
  };
  return findEventHelper(where) as Promise<EventShape>;
}

export async function findEventsByOwnerId(id: number): Promise<EventShape[] | null> {
  return findEventHelper({ ownerId: id }, true) as Promise<EventShape[]>;
}

export async function findEventsByPocId(id: number): Promise<EventShape[] | null> {
  return findEventHelper({ pocIds: id }, true) as Promise<EventShape[]>;
}

export async function findEventsByCollaboratorId(id: number): Promise<EventShape[] | null> {
  return findEventHelper({ collaboratorIds: [id] }, true) as Promise<EventShape[]>;
}

export async function findEventsByRegionId(id: number): Promise<EventShape[] | null> {
  return findEventHelper({ regionId: id }, true) as Promise<EventShape[]>;
}

/**
 * Determine if a POC can see sessions based on event organizer type
 * @param event - The event
 * @returns boolean - true if POC can see sessions
 */
const pocCanSeeSessionsForEvent = (event: EventShape): boolean => {
  const organizerType = event.data?.eventOrganizer;

  // POCs can NOT see sessions for "Regional TTA Hosted Event (no National Centers)"
  if (organizerType === 'Regional TTA Hosted Event (no National Centers)') {
    return false;
  }

  // POCs CAN see sessions for "Regional PD Event (with National Centers)"
  // regardless of trainer type
  if (organizerType === 'Regional PD Event (with National Centers)') {
    return true;
  }

  // Default: allow POC to see sessions (defensive)
  return true;
};

/**
 * Check if user can view a specific session based on their role and session status
 * @param session - The session
 * @param event - The event containing the session
 * @param userId - The user ID
 * @param isOwner - Is user the event owner
 * @param isCollaborator - Is user an event collaborator
 * @param isPoc - Is user an event POC
 * @returns boolean - true if user can view the session
 */
const canUserViewSession = (
  session: SessionShape,
  event: EventShape,
  userId: number,
  isOwner: boolean,
  isCollaborator: boolean,
  isPoc: boolean,
): boolean => {
  const sessionStatus = session.data?.status;

  // Owner and collaborators always see all sessions
  if (isOwner || isCollaborator) {
    return true;
  }

  // POC visibility depends on event organizer type
  if (isPoc) {
    // Check if POC can see sessions for this event type
    if (!pocCanSeeSessionsForEvent(event)) {
      return false; // POC cannot see any sessions for this event type
    }
    // POC can see sessions for this event type
    return true;
  }

  if (session.approverId === userId && session.submitted) {
    // approvers can see all sessions but shouldn't see the edit link on the session card if the session is not "submitted"
    // (and hasn't been returned for edits, I.E. needs_action)
    return true;
  }

  // Regional users (everyone else) can only see COMPLETE sessions
  return sessionStatus === TRS.COMPLETE;
};

/**
 * Filter sessions in a single event based on user role and visibility rules
 * @param event - The event containing sessions
 * @param userId - The user ID
 * @param isAdmin - Whether the user is an admin
 * @returns EventShape with filtered sessions
 */
export function filterEventSessions(
  event: EventShape,
  userId: number,
  isAdmin = false,
): EventShape {
  // Admins see everything
  if (isAdmin) return event;

  const isOwner = event.ownerId === userId;
  const isCollaborator = event.collaboratorIds.includes(userId);
  const isPoc = event.pocIds && event.pocIds.includes(userId);

  const filteredSessions = event.sessionReports.filter((session) => canUserViewSession(session, event, userId, isOwner, isCollaborator, isPoc));

  return {
    ...event,
    sessionReports: filteredSessions,
  };
}

/**
 *
 * remember, regional filtering is done in the previous step
 * so all we need to do here is a last cleanup of the data by status
 *
 * @param events
 * @param status
 * @param userId
 * @returns
 */
export async function filterEventsByStatus(events: EventShape[], status: string, userId: number, isAdmin = false) : Promise<EventShape[]> {
  // Admins see everything
  if (isAdmin) return events;

  switch (status) {
    case TRS.NOT_STARTED:
    case null:
      /**
       * Not started events
       * Visible only to owner or POC
       * 12/14/25
       * - Collaborators CANNOT see NOT_STARTED events (changed from previous behavior)
       */
      return events.filter((event) => {
        // Owner can see
        if (event.ownerId === userId) {
          return true;
        }

        // POC can see
        if (event.pocIds && event.pocIds.includes(userId)) {
          return true;
        }

        // Collaborators CANNOT see NOT_STARTED events
        return false;
      });

    case TRS.IN_PROGRESS:
      /**
       * In progress events
       * Only form users see the event, session visibility varies by role
       */
      return events.map((event) => {
        const isOwner = event.ownerId === userId;
        const isCollaborator = event.collaboratorIds.includes(userId);
        const isPoc = event.pocIds && event.pocIds.includes(userId);
        const isApproverWithSubmittedSession = event.sessionReports.some((session) => session.approverId === userId && session.submitted);

        if (!isOwner && !isCollaborator && !isPoc && !isApproverWithSubmittedSession) {
          // User has no role in this event, return nothing, to be filtered out
          // in the next array loop
          return null;
        }

        // Filter sessions based on user role and event organizer type
        const filteredSessions = event.sessionReports.filter((session) => canUserViewSession(session, event, userId, isOwner, isCollaborator, isPoc));

        return {
          // I am going to ts-ignore this to avoid implementing a new type
          // to represent the sequelize model vs the data shape as
          // that would require a snipe hunt through the TR services
          // @ts-ignore
          ...event.toJSON(),
          sessionReports: filteredSessions,
        };
      }).filter((event) => Boolean(event)) as EventShape[];

    case TRS.COMPLETE:
    case TRS.SUSPENDED:
      // Everyone with regional permissions sees all events and all sessions
      return events;

    default:
      return [];
  }
}

export async function findEventsByStatus(
  status: string,
  readableRegions: number[],
  userId: number,
  fallbackValue = undefined,
  allowNull = false,
  scopes = undefined,
  isAdmin = false,
): Promise<EventShape[] | null> {
  const events = await findEventHelperBlob({
    key: 'status',
    value: status,
    regions: readableRegions,
    fallbackValue,
    allowNull: status === TRS.NOT_STARTED || allowNull,
    scopes,
  }) as EventShape[];

  return filterEventsByStatus(events, status, userId, isAdmin);
}

export async function findAllEvents(): Promise<EventShape[]> {
  return EventReportPilot.findAll({
    attributes: [
      'id',
      'ownerId',
      'pocIds',
      'collaboratorIds',
      'regionId',
      'data',
    ],
    raw: true,
  });
}

const splitPipe = (str: string) => str.split('\n').map((s) => s.trim()).filter(Boolean);

const mappings: Record<string, string> = {
  Audience: 'eventIntendedAudience',
  // 'IST/Creator': 'creator',
  'Event Creator': 'creator',
  // 'Event Title': 'eventName',
  'Edit Title': 'eventName',
  'Event Duration': 'trainingType',
  'Event Duration/#NC Days of Support': 'trainingType',
  'Event Duration/# NC Days of Support': 'trainingType',
  'Event ID': 'eventId',
  'Overall Vision/Goal for the PD Event': 'vision',
  'Event Approach': 'trainingType',
  'Vision/Goal/Outcomes for the PD Event': 'vision',
  'Vision/Outcomes for the PD Event': 'vision',
  'Reason for Activity': 'reasons',
  // 'Reason(s) for PD': 'reasons', // TODO: Verify data should no longer be imported
  'Target Population(s)': 'targetPopulations',
  'Event Organizer - Type of Event': 'eventOrganizer',
  'IST Name:': 'istName',
  'IST Name': 'istName',
  'State/Territory Invited': 'additionalStates',
};

const toSplit = [
  'targetPopulations',
  'reasons',
  'additionalStates',
];

const replacements: Record<string, string> = {
  'Preschool (ages 3-5)': 'Preschool Children (ages 3-5)',
  'Pregnant Women/Pregnant People': 'Expectant families',
  'Pregnant Women': 'Expectant families',
};

const applyReplacements = (value: string) => replacements[value] || value;

export const mapLineToData = (line: Record<string, string>) => {
  const data: Record<string, unknown> = {};

  Object.keys(line).forEach((key) => {
    // Only process the key if it exists in the mappings.
    if (Object.keys(mappings).includes(key)) {
      const mappedKey = mappings[key] || key;
      data[mappedKey] = toSplit.includes(mappedKey)
        ? splitPipe(line[key]).map(applyReplacements) : line[key];
    }
  });

  return data;
};

export const checkUserExists = async (key:'email' | 'name', value: string) => {
  const user = await db.User.findOne({
    where: {
      [key]: {
        [Op.iLike]: value,
      },
    },
    include: [
      {
        model: db.Permission,
        as: 'permissions',
      },
      {
        model: db.Role,
        as: 'roles',
      },
    ],
  });

  if (!user) {
    throw new Error(`User with ${key}: ${value} does not exist`);
  }
  return user;
};

export const checkUserExistsByNationalCenter = async (identifier: string) => {
  const user = await db.User.findOne({
    attributes: ['id', 'name'],
    include: [
      {
        model: db.Permission,
        as: 'permissions',
      },
      {
        attributes: ['name'],
        model: db.NationalCenter,
        as: 'nationalCenters',
        where: {
          name: identifier,
        },
        required: true,
      },
    ],
  });

  if (!user) throw new Error(`User associated with National Center: ${identifier} does not exist`);
  return user;
};

const checkUserExistsByName = async (name: string) => checkUserExists('name', name);

const checkUserExistsByEmail = async (email: string) => checkUserExists('email', email);

const checkEventExists = async (eventId: string) => {
  const event = await db.EventReportPilot.findOne({
    attributes: ['id'],
    where: {
      id: {
        [Op.in]: sequelize.literal(
          `(SELECT id FROM "EventReportPilots" WHERE data->>'eventId' = '${eventId}')`,
        ),
      },
    },
  });

  if (event) throw new Error(`Event ${eventId} already exists`);
};

export async function csvImport(buffer: Buffer) {
  const skipped: string[] = [];
  const errors: string[] = [];

  const parsed = parse(buffer, { skipEmptyLines: true, columns: true });
  const results = parsed.map(async (line: Record<string, string>) => {
    try {
      const cleanLine = Object.fromEntries(
        Object.entries(line).map(([key, value]) => [key.trim(), value.trim()]),
      );

      const eventId = cleanLine['Event ID'];

      // If the eventId doesn't start with the prefix R and two numbers, it's invalid.
      const match = eventId.match(/^R\d{2}/i);
      if (match === null) {
        skipped.push(`Invalid "Event ID" format expected R##-TR-#### received ${eventId}`);
        return false;
      }

      await checkEventExists(eventId);

      // Validate audience else skip.
      if (!EVENT_AUDIENCE.includes(cleanLine.Audience)) {
        skipped.push(`Value "${cleanLine.Audience || ''}" is invalid for column "Audience". Must be of one of ${EVENT_AUDIENCE.join(', ')}: ${eventId}`);
        return false;
      }

      const regionId = Number(eventId.split('-')[0].replace(/\D/g, '').replace(/^0+/, ''));

      const creator = cleanLine['IST/Creator'] || cleanLine.Creator || cleanLine['Event Creator'];
      if (!creator) {
        errors.push(`No creator listed on import for ${eventId}`);
        return false;
      }
      let owner: { name: string; id: number; };
      if (creator) {
        owner = await checkUserExistsByEmail(creator);

        const policy = new EventReport(owner, {
          regionId,
        });

        if (!policy.canWriteInRegion()) {
          errors.push(`User ${creator} does not have permission to write in region ${regionId}`);
          return false;
        }
      }

      const pocs = [];

      if (cleanLine['Designated POC for Event/Request']) {
        const pocNames = cleanLine['Designated POC for Event/Request'].split('/').map((name) => name.trim());
        // eslint-disable-next-line no-restricted-syntax
        for await (const pocName of pocNames) {
          const poc = await checkUserExistsByName(pocName);
          const policy = new EventReport(poc, {
            regionId,
          });

          if (!policy.hasPocInRegion()) {
            errors.push(`User ${pocName} does not have POC permission in region ${regionId}`);
            return false;
          }
          pocs.push(poc.id);
        }
      }

      const organizer = cleanLine['Event Organizer - Type of Event'];
      if (!['Regional PD Event (with National Centers)', 'Regional TTA Hosted Event (no National Centers)'].includes(organizer)) {
        errors.push(`Event Organizer "${organizer}" is not valid for import: ${eventId}. Valid options are "Regional PD Event (with National Centers)" or "Regional TTA Hosted Event (no National Centers)"`);
        return false;
      }

      const data = mapLineToData(cleanLine);

      // right now the valid values in the CSV are 'Recipients' and 'Regional office/TTA', and the form expects
      // the values to be 'recipients' and 'regional-office-tta', so this will transform the values to match
      // so the form is correctly populated
      data.eventIntendedAudience = (data.eventIntendedAudience as string).replace(/ |\//g, '-').toLowerCase();

      // Reasons, remove duplicates and invalid values.
      data.reasons = [...new Set(data.reasons as string[])].filter((reason) => REASONS.includes(reason));

      // Target Populations, remove duplicates and invalid values.
      data.targetPopulations = [...new Set(data.targetPopulations as string[])].filter((target) => [...TARGET_POPULATIONS, ...EVENT_TARGET_POPULATIONS].includes(target));

      // Additional States Involved, remove duplicates.
      data.additionalStates = [...new Set(data.additionalStates as string[])]; // TODO: (maybe) create master list of states/outer pacific to validate against

      await db.EventReportPilot.create({
        collaboratorIds: [],
        ownerId: owner.id,
        regionId,
        pocIds: pocs,
        data: sequelize.cast(JSON.stringify(data), 'jsonb'),
        imported: sequelize.cast(JSON.stringify(cleanLine), 'jsonb'),
      });

      return true;
    } catch (error) {
      const message = (error.message || '').replace(/\/t/g, '');
      if (message.startsWith('User')) {
        errors.push(message);
      } else if (error.message.startsWith('Event')) {
        skipped.push(line['Event ID']);
      } else {
        // Push other errors to errors array
        errors.push(message);
      }
      return false;
    }
  });

  const count = (await Promise.all(results)).filter(Boolean).length;

  return {
    count,
    skipped,
    errors,
  };
}
