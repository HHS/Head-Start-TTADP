import { cast } from 'sequelize';
import db, { sequelize } from '../models';
import { SessionReportShape } from './types/sessionReport';
import { findEventBySmartsheetIdSuffix, findEventByDbId } from './event';

const {
  SessionReportPilot,
  EventReportPilot,
  SessionReportPilotFile,
  SessionReportPilotSupportingAttachment,
} = db;

export const validateFields = (request, requiredFields) => {
  const missingFields = requiredFields.filter((field) => !request[field]);

  if (missingFields.length) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }
};

export async function destroySession(id: number): Promise<void> {
  // Delete files.
  await SessionReportPilotFile.destroy(
    { where: { sessionReportPilotId: id } },
    { individualHooks: true },
  );

  // Delete supporting attachments.
  await SessionReportPilotSupportingAttachment.destroy(
    { where: { sessionReportPilotId: id } },
    { individualHooks: true },
  );

  // Delete session.
  await SessionReportPilot.destroy({ where: { id } }, { individualHooks: true });
}

type WhereOptions = {
  id?: number;
  eventId?: number;
  data?: unknown;
};

// eslint-disable-next-line max-len
export async function findSessionHelper(where: WhereOptions, plural = false): Promise<SessionReportShape | SessionReportShape[] | null> {
  let session;

  const query = {
    attributes: [
      'id',
      'eventId',
      'data',
      'updatedAt',
      // eslint-disable-next-line @typescript-eslint/quotes
      [sequelize.literal(`Date(NULLIF("SessionReportPilot".data->>'startDate',''))`), 'startDate'],
    ],
    where,
    order: [['startDate', 'ASC']],
    include: [
      {
        model: db.File,
        as: 'files',
      },
      {
        model: EventReportPilot,
        as: 'event',
      },
      {
        model: db.File,
        as: 'supportingAttachments',
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
    supportingAttachments: session?.supportingAttachments ?? [],
    updatedAt: session?.updatedAt,
    event: session?.event ?? {},
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

  // Combine existing session data with new data.
  const existingData = session.data;
  const newData = { ...existingData, ...data };

  const event = await findEventBySmartsheetIdSuffix(eventId);

  await SessionReportPilot.update(
    {
      eventId: event.id,
      data: cast(JSON.stringify(newData), 'jsonb'),
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
