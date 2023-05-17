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

export async function destroyTR(id) {
  return TrainingReportPilot.destroy({ where: { id } });
}

type WhereOptions = {
  id?: number;
  eventId?: number;
};

// eslint-disable-next-line max-len
async function findTRHelper(where: WhereOptions, plural = false): Promise<TrainingReportShape | TrainingReportShape[] | null> {
  let tr;

  const query = {
    attributes: [
      'id',
      'eventId',
      'data',
    ],
    where,
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

  if (Array.isArray(tr)) {
    return tr;
  }

  return {
    id: tr?.id,
    eventId: tr?.eventId,
    data: tr?.data ?? {},
  };
}

export async function createTR(request) {
  validateFields(request, ['eventId', 'data']);

  const { eventId, data } = request;

  const created = await TrainingReportPilot.create({
    eventId,
    data: cast(JSON.stringify(data), 'jsonb'),
  });

  return findTRHelper({ id: created.dataValues.id }) as Promise<TrainingReportShape>;
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

  await TrainingReportPilot.update(
    {
      eventId,
      data: cast(JSON.stringify(data), 'jsonb'),
    },
    { where: { id } },
  );

  return findTRHelper({ id }) as Promise<TrainingReportShape>;
}

export async function findTRById(id: number): Promise<TrainingReportShape> {
  return findTRHelper({ id }) as Promise<TrainingReportShape>;
}

export async function findTRsByEventId(eventId): Promise<TrainingReportShape[]> {
  return findTRHelper({ eventId }, true) as Promise<TrainingReportShape[]>;
}
