import { cast } from 'sequelize';
import db from '../models';
import { SessionReportShape } from './types/sessionReport';

const { SessionReportPilot } = db;

const validateFields = (request, requiredFields) => {
  const missingFields = requiredFields.filter((field) => !request[field]);

  if (missingFields.length) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }
};

export async function destroySession(id: number): Promise<void> {
  await SessionReportPilot.destroy({ where: { id } }, { individualHooks: true });
}

type WhereOptions = {
  id?: number;
  eventId?: number;
};

// eslint-disable-next-line max-len
async function findSessionHelper(where: WhereOptions, plural = false): Promise<SessionReportShape | SessionReportShape[] | null> {
  let session;

  const query = {
    attributes: [
      'id',
      'eventId',
      'data',
      'updatedAt',
    ],
    where,
    include: [
      {
        model: db.File,
        as: 'files',
      },
      {
        model: db.EventReportPilot,
        as: 'event',
      },
    ],
  };

  if (plural) {
    session = await SessionReportPilot.findAll(query);
  } else {
    session = await SessionReportPilot.findOne(query);
  }

  if (!session) {
    return null;
  }

  if (Array.isArray(session)) {
    return session;
  }

  return {
    id: session?.id,
    eventId: session?.eventId,
    data: session?.data ?? {},
    files: session?.files ?? [],
    updatedAt: session?.updatedAt,
    event: session?.event ?? {},
  };
}

export async function createSession(request) {
  validateFields(request, ['eventId', 'data']);

  const { eventId, data } = request;

  const created = await SessionReportPilot.create({
    eventId,
    data: cast(JSON.stringify(data), 'jsonb'),
  }, {
    individualHooks: true,
  });

  return findSessionHelper({ id: created.dataValues.id }) as Promise<SessionReportShape>;
}

export async function updateSession(id, request) {
  const session = await SessionReportPilot.findOne({
    where: { id },
  });

  if (!session) {
    return createSession(request);
  }

  validateFields(request, ['eventId', 'data']);

  const { eventId, data } = request;

  await SessionReportPilot.update(
    {
      eventId,
      data: cast(JSON.stringify(data), 'jsonb'),
    },
    {
      where: { id },
      individualHooks: true,
    },
  );

  return findSessionHelper({ id }) as Promise<SessionReportShape>;
}

export async function findSessionById(id: number): Promise<SessionReportShape> {
  return findSessionHelper({ id }) as Promise<SessionReportShape>;
}

export async function findSessionsByEventId(eventId): Promise<SessionReportShape[]> {
  return findSessionHelper({ eventId }, true) as Promise<SessionReportShape[]>;
}

export async function getPossibleSessionParticipants(
  regionId: number,
) : Promise<{ id: number, name: string }[]> {
  const where = { status: 'Active', regionId };

  return db.Recipient.findAll({
    attributes: ['id', 'name'],
    order: ['name'],
    include: [{
      where,
      model: db.Grant,
      as: 'grants',
      attributes: ['id', 'name', 'number'],
      include: [{
        model: db.Recipient,
        as: 'recipient',
        attributes: ['id', 'name'],
      },
      {
        model: db.Program,
        as: 'programs',
        attributes: ['programType'],
      },
      ],
    }],
  });
}
