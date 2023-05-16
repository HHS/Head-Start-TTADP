import { cast } from 'sequelize';
import db from '../models';

const { TrainingReportPilot } = db;

export async function createTR(request) {
  const requiredFields = ['eventId', 'data'];

  const missingFields = requiredFields.filter((field) => !request[field]);

  if (missingFields.length) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }

  const { eventId, data } = request;

  return TrainingReportPilot.create({
    eventId,
    data: cast(JSON.stringify(data), 'jsonb'),
  });
}

export async function updateTR(id, request) {
  const tr = await TrainingReportPilot.findOne({
    where: { id },
  });

  if (!tr) {
    return createTR(request);
  }

  const { eventId, data } = request;

  return TrainingReportPilot.update(
    {
      eventId,
      data: cast(JSON.stringify(data), 'jsonb'),
    },
    { where: { id } },
  );
}

type WhereOptions = {
  id?: number;
  eventId?: number;
};

async function findTRHelper(whereClause: WhereOptions, plural = false) {
  const finder = plural ? TrainingReportPilot.findAll : TrainingReportPilot.findOne;

  const tr = await finder({
    attributes: [
      'id',
      'eventId',
      'data',
    ],
    where: whereClause,
    raw: true,
  });

  if (!tr) {
    return null;
  }

  return {
    id: tr?.id,
    eventId: tr?.eventId,
    data: tr?.data ?? {},
  };
}

export async function findTRById(id) {
  return findTRHelper({ id });
}

export async function findTRByEventId(eventId) {
  return findTRHelper({ eventId });
}
