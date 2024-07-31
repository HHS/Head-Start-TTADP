/* eslint-disable max-len */
import { Op, cast, WhereOptions as SequelizeWhereOptions } from 'sequelize';
import parse from 'csv-parse/lib/sync';
import _ from 'lodash';
import {
  TRAINING_REPORT_STATUSES as TRS,
  REASONS,
  TARGET_POPULATIONS,
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

const {
  EventReportPilot,
  SessionReportPilot,
  User,
  EventReportPilotNationalCenterUser,
} = db;

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

async function findEventHelper(where, plural = false): Promise<EventShape | EventShape[] | null> {
  let event;

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
        attributes: [
          'id',
          'eventId',
          'data',
          'createdAt',
          'updatedAt',
          // eslint-disable-next-line @typescript-eslint/quotes
          [sequelize.literal(`Date(NULLIF("SessionReportPilot".data->>'startDate',''))`), 'startDate'],
        ],
        as: 'sessionReports',
        separate: true, // This is required to order the joined table results.
        order: [['startDate', 'ASC'], ['data.sessionName', 'ASC'], ['createdAt', 'ASC']],
      },
    ],
  };

  if (plural) {
    event = await EventReportPilot.findAll(query);
  } else {
    event = await EventReportPilot.findOne(query);
  }

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
          'nameWithNationalCenters',
        ],
        include: [
          {
            model: db.NationalCenter,
            as: 'nationalCenters',
          },
        ],
      });

      if (ownerUser) {
        owner = ownerUser.toJSON();
      }
    } else {
      owner = null;
    }
  }

  return {
    id: event?.id,
    ownerId: event?.ownerId,
    owner,
    pocIds: event?.pocIds,
    collaboratorIds: event?.collaboratorIds,
    regionId: event?.regionId,
    data: event?.data ?? {},
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

async function findEventHelperBlob({
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

type WhereOptions = {
  id?: number;
  ownerId?: number;
  pocIds?: number;
  collaboratorIds?: number[];
  regionId?: number;
};

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

  if (ownerId) {
    const newOwner = await User.findOne(
      {
        where: { id: ownerId },
        attributes: [
          'id',
          'nameWithNationalCenters',
          'email',
          'name',
        ],
        include: [
          {
            model: db.NationalCenter,
            as: 'nationalCenters',
          },
        ],
      },
    );

    if (newOwner) {
      // update the owner in the data.
      data.owner = newOwner.toJSON();
    }
  }

  await EventReportPilot.update(
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
    data: {
      eventId: string;
      eventName: string;
    },
  },
  alertType: string,
  sessionName = '--',
) => ({
  id: event.id,
  eventId: event.data.eventId,
  eventName: event.data.eventName,
  alertType,
  sessionName,
  isSession: sessionName !== '--',
});

// type for an array of either strings of functions that return a boolean
type Checkers = (string | ((data: SessionShape['data']) => boolean))[];

const checkSessionForCompletion = (
  session: SessionShape,
  event: EventShape,
  checkers: Checkers,
  missingSessionInfo: TRAlertShape[],
) => {
  let sessionValid = true;

  // eslint-disable-next-line no-restricted-syntax
  for (const field of checkers) {
    if (typeof field === 'function') {
      if (!field(session.data)) {
        sessionValid = false;
        break;
      }
    } else if (!(session.data[field])) {
      sessionValid = false;
      break;
    }
  }

  if (!sessionValid) {
    missingSessionInfo.push({
      id: session.id,
      eventId: event.data.eventId,
      isSession: true,
      sessionName: session.data.sessionName,
      eventName: event.data.eventName,
      alertType: 'missingSessionInfo',
    });
  }
};

export async function getTrainingReportAlerts(userId: number, regions: number[]): Promise<TRAlertShape[]> {
  const where = {
    [Op.and]: [
      {
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
      },
      {
        regionId: {
          [Op.in]: regions,
        },
        data: {
          status: {
            [Op.notIn]: [TRS.COMPLETE, TRS.SUSPENDED],
          },
        },
      },
    ],
  };

  // get all events that the user is a part of and that are not complete/suspended
  const events = await findEventHelper(where, true) as EventShape[];

  auditLogger.info({ events });

  const alerts = [];

  // missingEventInfo: Missing event info (IST Creator or Collaborator) - 20 days past event start date
  // missingSessionInfo: Missing session info (IST Creator or Collaborator or POC) - 20 days past session start date
  // noSessionsCreated: No sessions created (IST Creator) - 20 days past event start date
  // eventNotCompleted: Event not completed (IST Creator or Collaborator) - 20 days past event end date

  // the only fields that aren't read only
  const eventInfoToCheck = ['startDate', 'endDate'];
  const eventArraysToCheck = ['collaboratorIds'];
  const istSessionInfoToCheck = [
    'startDate',
    'endDate',
    'sessionName',
    'duration',
    'objective',
    'objectiveTopics',
    'objectiveTrainers',
    (sessionData: SessionShape['data']) => {
      if (sessionData.useIpdCourses) {
        return !!(sessionData.courses?.length);
      }

      return true;
    },
    'ttaProvided',
    'supportType',
  ];
  const pocSessionInfoToCheck = [
    'deliveryMethod',
    (sessionData : SessionShape['data']) => {
      if (sessionData.isIstVisit === 'yes') {
        return !!(sessionData.regionalOfficeTta)?.length;
      }

      if (sessionData.isIstVisit === 'no') {
        return !!(sessionData.participants?.length);
      }

      return false;
    },
    'language',
    (sessionData: SessionShape['data']) => {
      const { nextSteps } = sessionData;
      if (!nextSteps?.length) {
        return false;
      }

      return nextSteps.every((step) => step.note && step.completeDate);
    },
  ];

  const today = moment().startOf('day');

  events.forEach((event: EventShape) => {
    // some alerts only trigger for the owner or the collaborators
    if (event.ownerId === userId || event.collaboratorIds.includes(userId)) {
      const nineteenDaysAfterStart = moment(event.data.startDate).startOf('day').add(19, 'days');
      const nineteenDaysAfterEnd = moment(event.data.endDate).startOf('day').add(19, 'days');

      // if we are 20 days past the start date
      if (today.isAfter(nineteenDaysAfterStart)) {
        // and there are no sessions
        if (event.sessionReports.length === 0) {
          alerts.push(parseMinimalEventForAlert(event, 'noSessionsCreated'));
        }

        // or we are missing event data
        if (eventInfoToCheck.some((field) => !(event.data[field])) || eventArraysToCheck.some((field) => !(event[field]?.length))) {
          alerts.push(parseMinimalEventForAlert(event, 'missingEventInfo'));
        }
      }

      // if we are 20 days past the end date, and the event is not completed
      if (event.data.status !== TRS.COMPLETE && today.isAfter(nineteenDaysAfterEnd)) {
        alerts.push(parseMinimalEventForAlert(event, 'eventNotCompleted'));
      }

      const sessions = event.sessionReports;
      sessions.forEach((session) => {
        if (alerts.find((alert) => alert.isSession && alert.id === session.id)) return;
        const nineteenDaysAfterSessionStart = moment(session.data.startDate).startOf('day').add(19, 'days');
        if (today.isAfter(nineteenDaysAfterSessionStart)) {
          checkSessionForCompletion(session, event, istSessionInfoToCheck, alerts);
        }
      });
    }

    // the other event triggers for everyone
    const sessions = event.sessionReports;
    sessions.forEach((session) => {
      if (alerts.find((alert) => alert.isSession && alert.id === session.id)) return;
      const nineteenDaysAfterStart = moment(session.data.startDate).startOf('day').add(19, 'days');
      if (today.isAfter(nineteenDaysAfterStart)) {
        // eslint-disable-next-line no-restricted-syntax
        checkSessionForCompletion(session, event, pocSessionInfoToCheck, alerts);
      }
    }); // for each session
  }); // for each event

  return alerts;
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
  // do not filter if admin
  if (isAdmin) return events;

  switch (status) {
    case TRS.NOT_STARTED:
    case null:
      /**
       * Not started events
       * You see them if
       * - You are the POC, owner, or collaborator
       */
      return events.filter((event) => {
        // pocIds is nullable
        if (event.pocIds && event.pocIds.includes(userId)) {
          return true;
        }

        if (event.collaboratorIds.includes(userId)) {
          return true;
        }

        if (event.ownerId === userId) {
          return true;
        }

        return false;
      });
    case TRS.IN_PROGRESS:
      /**
       * In progress events
       * You see all of them with regional permissions
       * but you may not see all sessions
       *
       */

      return events.map((event) => {
        // if you are owner, collaborator or poc, you see all sessions
        if (event.ownerId === userId) {
          return event;
        }

        if (event.collaboratorIds.includes(userId)) {
          return event;
        }

        if (event.pocIds && event.pocIds.includes(userId)) {
          return event;
        }

        // otherwise, you only see sessions that are "complete"
        const e = event;
        e.sessionReports = e.sessionReports.filter((session) => session.data.status === TRS.COMPLETE);

        return e;
      });
    case TRS.COMPLETE:
    case TRS.SUSPENDED:
      // everyone with regional permissions can see all sessions
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

  const es = await filterEventsByStatus(events, status, userId, isAdmin);
  return es;
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
  Audience: 'audience',
  Creator: 'creator',
  'Edit Title': 'eventName',
  'Event Title': 'eventName',
  'Event Duration/#NC Days of Support': 'eventDuration',
  'Event Duration/# NC Days of Support': 'eventDuration',
  'Event ID': 'eventId',
  'Overall Vision/Goal for the PD Event': 'vision',
  'Reason for Activity': 'reasons',
  'Target Population(s)': 'targetPopulations',
  'Event Organizer - Type of Event': 'eventOrganizer',
  'IST Name:': 'istName',
  'IST Name': 'istName',
};

const toSplit = ['targetPopulations', 'reasons'];

const replacements: Record<string, string> = {
  'Preschool (ages 3-5)': 'Preschool Children (ages 3-5)',
  'Pregnant Women/Pregnant People': 'Pregnant Women / Pregnant Persons',
  'Pregnant Women': 'Pregnant Women / Pregnant Persons',
};

const applyReplacements = (value: string) => replacements[value] || value;

const mapLineToData = (line: Record<string, string>) => {
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

const checkUserExists = async (creator: string) => {
  const user = await db.User.findOne({
    where: { email: creator },
    include: [
      {
        model: db.Permission,
        as: 'permissions',
      },
      {
        model: db.NationalCenter,
        as: 'nationalCenters',
      },
    ],
  });
  if (!user) throw new Error(`User ${creator} does not exist`);
  return user;
};

const checkEventExists = async (eventId: string) => {
  const event = await db.EventReportPilot.findOne({
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
      if (!eventId.match(/^R\d{2}/i)) {
        skipped.push(`Invalid "Event ID" format expected R##-TR-#### received ${eventId}`);
        return false;
      }

      // Validate audience else skip.
      if (!EVENT_AUDIENCE.includes(cleanLine.Audience)) {
        skipped.push(`Value "${cleanLine.Audience}" is invalid for column "Audience". Must be of one of ${EVENT_AUDIENCE.join(', ')}: ${eventId}`);
        return false;
      }

      const regionId = Number(eventId.split('-')[0].replace(/\D/g, '').replace(/^0+/, ''));

      const creator = cleanLine.Creator;
      let owner;
      if (creator) {
        owner = await checkUserExists(creator);
        const policy = new EventReport(owner, {
          regionId,
        });

        if (!policy.canWriteInRegion()) {
          errors.push(`User ${creator} does not have permission to write in region ${regionId}`);
          return false;
        }
      }

      await checkEventExists(eventId);

      const data = mapLineToData(cleanLine);

      data.goals = []; // shape: { grantId: number, goalId: number, sessionId: number }[]
      data.goal = '';

      // Reasons, remove duplicates and invalid values.
      data.reasons = [...new Set(data.reasons as string[])];
      data.reasons = (data.reasons as string[]).filter((reason) => REASONS.includes(reason));

      // Target Populations, remove duplicates and invalid values.
      data.targetPopulations = [...new Set(data.targetPopulations as string[])];
      data.targetPopulations = (data.targetPopulations as string[]).filter((target) => TARGET_POPULATIONS.includes(target));

      await db.EventReportPilot.create({
        collaboratorIds: [],
        ownerId: owner.id,
        regionId,
        data: sequelize.cast(JSON.stringify(data), 'jsonb'),
        imported: sequelize.cast(JSON.stringify(cleanLine), 'jsonb'),
      });

      return true;
    } catch (error) {
      if (error.message.startsWith('User')) {
        errors.push(error.message);
      } else if (error.message.startsWith('Event')) {
        skipped.push(line['Event ID']);
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
