import { cast } from 'sequelize';
import db from '../models';
import { TrainingReportShape } from './types/trainingReport';

const { TrainingReportPilot } = db;

const validateFields = (request, requiredFields) => {
  const missingFields = requiredFields.filter((field) => !request[field]);

  if (missingFields.length) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }
};

export async function createTR(request) {
  validateFields(request, ['eventId', 'data']);

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

  validateFields(request, ['eventId', 'data']);

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

// eslint-disable-next-line max-len
async function findTRHelper(whereClause: WhereOptions, plural = false): Promise<TrainingReportShape | TrainingReportShape[] | null> {
  let tr;

  const query = {
    attributes: [
      'id',
      'eventId',
      'data',
    ],
    where: whereClause,
    raw: true,
  };

  if (plural) {
    tr = await TrainingReportPilot.findAll(query);
  } else {
    tr = await TrainingReportPilot.findOne(query);
  }

  if (!tr) {
    return null;
  }

  return {
    id: tr?.id,
    eventId: tr?.eventId,
    data: tr?.data ?? {},
  };
}

export async function findTRById(id: number): Promise<TrainingReportShape> {
  return findTRHelper({ id }) as Promise<TrainingReportShape>;
}

export async function findTRByEventId(eventId): Promise<TrainingReportShape[]> {
  return findTRHelper({ eventId }, true) as Promise<TrainingReportShape[]>;
}
