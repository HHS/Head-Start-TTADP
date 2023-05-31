/* eslint-disable max-len */
import { cast } from 'sequelize';
import db from '../models';
import {
  EventShape,
  CreateEventRequest,
  UpdateEventRequest,
} from './types/event';

const {
  sequelize,
  EventReportPilot,
  SessionReportPilot,
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
 * @param {string} request.pocId - The ID of the point of contact.
 * @param {string[]} request.collaboratorIds - An array of IDs of collaborators.
 * @param {string} request.regionId - The ID of the region where the event will take place.
 * @param {unknown} request.data - The data associated with the event.
 *
 * @returns {Promise<EventShape>} A promise that resolves to the created event.
 *
 * @throws {Error} If any required fields are missing in the request data.
 */
export async function createEvent(request: CreateEventRequest): Promise<EventShape> {
  validateFields(request, ['ownerId', 'pocId', 'collaboratorIds', 'regionId', 'data']);

  const {
    ownerId,
    pocId,
    collaboratorIds,
    regionId,
    data,
  } = request;

  return EventReportPilot.create({
    ownerId,
    pocId,
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
  await SessionReportPilot.destroy({ where: { eventId: id } });
  await EventReportPilot.destroy({ where: { id } });
}

async function findEventHelper(where: WhereOptions, plural = false): Promise<EventShape | EventShape[] | null> {
  let event;

  const query = {
    attributes: [
      'id',
      'ownerId',
      'pocId',
      'collaboratorIds',
      'regionId',
      'data',
    ],
    where,
    raw: true,
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

  return {
    id: event?.id,
    ownerId: event?.ownerId,
    pocId: event?.pocId,
    collaboratorIds: event?.collaboratorIds,
    regionId: event?.regionId,
    data: event?.data ?? {},
  };
}

interface FindEventHelperBlobOptions {
  key: string;
  value: string;
  regions: number[] | undefined;
}

async function findEventHelperBlob({ key, value, regions }: FindEventHelperBlobOptions): Promise<EventShape[]> {
  let whereClause = `data->>'${key}' = '${value}' OR NOT (data ? '${key}')`;
  if (regions && regions.length) {
    whereClause += ` AND regionId IN (${regions.join(',')})`;
  }

  const events = EventReportPilot.findAll({
    attributes: [
      'id',
      'ownerId',
      'pocId',
      'collaboratorIds',
      'regionId',
      'data',
    ],
    raw: true,
    where: sequelize.literal(whereClause),
  });

  return events || null;
}

type WhereOptions = {
  id?: number;
  ownerId?: number;
  pocId?: number;
  collaboratorIds?: number[];
  regionId?: number;
};

/**
 * Updates an existing event in the database or creates a new one if it doesn't exist.
 * @param request An object containing all fields to be updated for the event.
 *                Required fields: id, ownerId, pocId, collaboratorIds, regionId, data.
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

  validateFields(request, ['ownerId', 'pocId', 'collaboratorIds', 'regionId', 'data']);

  const {
    ownerId,
    pocId,
    collaboratorIds,
    regionId,
    data,
  } = request;

  await EventReportPilot.update(
    {
      ownerId,
      pocId,
      collaboratorIds,
      regionId,
      data: cast(JSON.stringify(data), 'jsonb'),
    },
    { where: { id } },
  );

  return findEventHelper({ id }) as Promise<EventShape>;
}

export async function findEventById(id: number): Promise<EventShape | null> {
  return findEventHelper({ id }) as Promise<EventShape>;
}

export async function findEventsByOwnerId(id: number): Promise<EventShape[] | null> {
  return findEventHelper({ ownerId: id }, true) as Promise<EventShape[]>;
}

export async function findEventsByPocId(id: number): Promise<EventShape[] | null> {
  return findEventHelper({ pocId: id }, true) as Promise<EventShape[]>;
}

export async function findEventsByCollaboratorId(id: number): Promise<EventShape[] | null> {
  return findEventHelper({ collaboratorIds: [id] }, true) as Promise<EventShape[]>;
}

export async function findEventsByRegionId(id: number): Promise<EventShape[] | null> {
  return findEventHelper({ regionId: id }, true) as Promise<EventShape[]>;
}

export async function findEventsByStatus(status: string, readableRegions: number[]): Promise<EventShape[] | null> {
  return findEventHelperBlob({ key: 'status', value: status, regions: readableRegions }) as Promise<EventShape[]>;
}

export async function findAllEvents(): Promise<EventShape[]> {
  return EventReportPilot.findAll({
    attributes: [
      'id',
      'ownerId',
      'pocId',
      'collaboratorIds',
      'regionId',
      'data',
    ],
    raw: true,
  });
}
