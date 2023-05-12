import { DataTypes, cast } from 'sequelize';
import db from '../models';
import {
  EventShape,
  CreateEventRequest,
  FindEventRequest,
} from './types/event';

const {
  sequelize,
  Event,
} = db;

export async function createEvent(request: CreateEventRequest): Promise<EventShape> {
  const {
    ownerId,
    pocId,
    collaboratorIds,
    regionId,
    data,
  } = request;

  return Event.create({
    ownerId,
    pocId,
    collaboratorIds,
    regionId,
    data: cast(JSON.stringify(data), 'jsonb'),
  });
}

async function findEventHelper(whereClause: WhereOptions): Promise<EventShape> {
  const event = await Event.findOne({
    attributes: [
      'id',
      'ownerId',
      'pocId',
      'collaboratorIds',
      'regionId',
      'data',
    ],
    where: whereClause,
    raw: true,
  });

  return {
    id: event?.id,
    ownerId: event?.ownerId,
    pocId: event?.pocId,
    collaboratorIds: event?.collaboratorIds,
    regionId: event?.regionId,
    data: event?.data ?? {},
  };
}

type WhereOptions = {
  id?: number;
  ownerId?: number;
  pocId?: number;
  collaboratorIds?: number[];
};

export async function findEventById(request: FindEventRequest): Promise<EventShape> {
  const { id } = request;

  return findEventHelper({ id });
}

export async function findEventByOwnerId(request: FindEventRequest): Promise<EventShape> {
  const { id } = request;

  return findEventHelper({ ownerId: id });
}

export async function findEventByPocId(request: FindEventRequest): Promise<EventShape> {
  const { id } = request;

  return findEventHelper({ pocId: id });
}

export async function findEventByCollaboratorIds(request: FindEventRequest): Promise<EventShape> {
  const { id } = request;

  return findEventHelper({ collaboratorIds: [id] });
}

export async function findAllEvents(): Promise<EventShape[]> {
  return Event.findAll({
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
