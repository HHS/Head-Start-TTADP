import { cast, Op } from 'sequelize';
import { Cast } from 'sequelize/types/utils';
import { REPORT_STATUSES } from '@ttahub/common';
import db, { sequelize } from '../models';
import { SessionReportShape } from './types/sessionReport';
import { findEventBySmartsheetIdSuffix, findEventByDbId } from './event';
import { auditLogger } from '../logger';

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
  const query = {
    attributes: [
      'id',
      'eventId',
      'data',
      'updatedAt',
      'approverId',
      'submitterId',
      'submitted',
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
      {
        model: db.User,
        as: 'approver',
        attributes: [
          'fullName',
          'name',
          'id',
        ],
        include: [
          {
            model: db.Role,
            as: 'roles',
            attributes: [
              'name',
            ],
          },
        ],
      },
    ],
  };

  const session = plural
    ? await SessionReportPilot.findAll(query)
    : await SessionReportPilot.findOne(query);

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
    event: session?.event,
    approverId: session?.approverId ?? null,
    approver: session?.approver ?? null,
    submitted: session?.submitted ?? false,
    submitterId: session?.submitterId ?? null,
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
    data: cast(JSON.stringify({
      ...data,
      reviewStatus: REPORT_STATUSES.DRAFT,
      additionalStates: event.data.additionalStates || [],
    }), 'jsonb'),
  }, {
    individualHooks: true,
  });

  return findSessionHelper({ id: created.dataValues.id }) as Promise<SessionReportShape>;
}

export async function updateSession(id: number, request) {
  const session = await SessionReportPilot.findOne({
    where: { id },
  });

  if (!session) {
    return createSession(request);
  }

  validateFields(request, ['eventId', 'data']);

  const { eventId, data: { approverId, submitterId, ...data } } = request;

  // Combine existing session data with new data.
  const existingData = session.data;
  const newData = { ...existingData, ...data };

  const event = await findEventBySmartsheetIdSuffix(eventId);

  const update = {
    eventId: event.id,
    data: cast(JSON.stringify(newData), 'jsonb'),
  } as {
    eventId: number;
    approverId?: number;
    submitterId?: number;
    data: Cast;
  };

  if (approverId) {
    update.approverId = Number(approverId);
  }

  if (submitterId) {
    update.submitterId = Number(submitterId);
  }

  await SessionReportPilot.update(
    update,
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
  states?: string[],
) : Promise<{ id: number, name: string }[]> {
  const where = {
    status: 'Active',
  } as {
    status: string;
    regionId?: number;
    [Op.or]?: {
      regionId?: number;
      '$grants.stateCode$'?: string[];
    }[];
  };

  if (states && states.length > 0) {
    where[Op.or] = [
      { regionId },
      { '$grants.stateCode$': states },
    ];
  } else {
    where.regionId = regionId;
  }

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
