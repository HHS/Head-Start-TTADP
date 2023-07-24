/* eslint-disable max-len */
import { Op, cast, WhereOptions as SequelizeWhereOptions } from 'sequelize';
import _ from 'lodash';
import { TRAINING_REPORT_STATUSES as TRS } from '@ttahub/common';
import { auditLogger } from '../logger';
import db from '../models';
import {
  EventShape,
  CreateEventRequest,
  UpdateEventRequest,
} from './types/event';

const {
  EventReportPilot,
  SessionReportPilot,
  User,
} = db;

const validateFields = (request, requiredFields) => {
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
        model: SessionReportPilot,
        as: 'sessionReports',
        order: [['data.startDate', 'ASC'], ['data.title', 'ASC']],
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

  let owner: undefined | { id: string; name: string; email: string };

  if (event.ownerId) {
    owner = await User.findByPk(event.ownerId, { attributes: ['id', 'name', 'email'], raw: true });
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
        order: [['data.startDate', 'ASC'], ['data.title', 'ASC']],
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

  await EventReportPilot.update(
    {
      ownerId,
      pocIds,
      collaboratorIds,
      regionId,
      data: cast(JSON.stringify(data), 'jsonb'),
    },
    { where: { id } },
  );

  return findEventHelper({ id }) as Promise<EventShape>;
}

export async function findEventById(id: number, scopes: WhereOptions[] = [{}]): Promise<EventShape | null> {
  const where = {
    [Op.and]: [
      { id },
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
export async function filterEventsByStatus(events: EventShape[], status: string, userId: number) : Promise<EventShape[]> {
  switch (status) {
    case TRS.NOT_STARTED:
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

export async function findEventsByStatus(status: string, readableRegions: number[], userId: number, fallbackValue = undefined, allowNull = false, scopes = undefined): Promise<EventShape[] | null> {
  const events = await findEventHelperBlob({
    key: 'status',
    value: status,
    regions: readableRegions,
    fallbackValue,
    allowNull: status === TRS.NOT_STARTED || allowNull,
    scopes,
  }) as EventShape[];

  const es = await filterEventsByStatus(events, status, userId);
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
