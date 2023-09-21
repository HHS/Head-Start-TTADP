import { cast } from 'sequelize';
import db from '../models';
import { SessionReportShape } from './types/sessionReport';
import { findEventBySmartsheetIdSuffix, findEventByDbId } from './event';

const { SessionReportPilot, EventReportPilot, SessionReportPilotFile } = db;

const validateFields = (request, requiredFields) => {
  const missingFields = requiredFields.filter((field) => !request[field]);

  if (missingFields.length) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }
};

export async function destroySession(id: number): Promise<void> {
  await SessionReportPilotFile.destroy(
    { where: { sessionReportPilotId: id } },
    { individualHooks: true },
  );
  await SessionReportPilot.destroy({ where: { id } }, { individualHooks: true });
}

type WhereOptions = {
  id?: number;
  eventId?: number;
  data?: unknown;
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
        model: EventReportPilot,
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

  const eventId = (() => {
    if (session.event) {
      const fullId = session.event.data.eventId;
      // we need to get the last four digits of the smartsheet provided
      // event id, which is in the format R01-PD-1037
      return fullId.substring(fullId.lastIndexOf('-') + 1);
    }

    return null;
  })();

  return {
    id: session?.id,
    eventId,
    data: session?.data ?? {},
    files: session?.files ?? [],
    updatedAt: session?.updatedAt,
  };
}

export async function createSession(request) {
  validateFields(request, ['eventId', 'data']);

  const { eventId, data } = request;

  const event = await findEventByDbId(eventId);

  if (!event) {
    throw new Error(`Event with id ${eventId} not found`);
  }

  const created = await SessionReportPilot.create({
    eventId: event.id,
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

  const event = await findEventBySmartsheetIdSuffix(eventId);

  await SessionReportPilot.update(
    {
      eventId: event.id,
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
