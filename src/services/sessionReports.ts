import { ALL_STATES_FLATTENED, REPORT_STATUSES, TRAINING_REPORT_STATUSES } from '@ttahub/common';
import moment from 'moment';
import { cast, type Model, Op } from 'sequelize';
import type { Cast } from 'sequelize/types/utils';
import db, { sequelize } from '../models';
import parseDate from '../lib/date';
import filtersToScopes from '../scopes';
import { findEventByDbId, findEventBySmartsheetId } from './event';
import type {
  GetSessionReportsForRecipientParams,
  GetSessionReportsParams,
  GetSessionReportsResponse,
  SessionReportShape,
  SessionReportSortSortMap,
} from './types/sessionReport';

const {
  SessionReportPilot,
  EventReportPilot,
  SessionReportPilotFile,
  SessionReportPilotSupportingAttachment,
  SessionReportPilotGoalTemplate,
  SessionReportPilotTrainer,
  Grant,
} = db;

type WhereOptions = {
  id?: number;
  eventId?: number;
  data?: unknown;
};

// Hydrated associations (the parent event record and the approver user record)
// are returned to the client as separate associations and must never be persisted
// back into the session's JSONB `data` column. Storing them creates a stale,
// duplicate source of truth. This is a server-side backstop so no client payload
// can reintroduce the duplication regardless of how the form serializes its state.
export const SESSION_ASSOCIATION_KEYS = ['approver', 'event'] as const;

export const removeAssociationsFromData = (data: unknown): Record<string, unknown> => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return {};
  }

  const cleaned: Record<string, unknown> = { ...(data as Record<string, unknown>) };
  for (const key of SESSION_ASSOCIATION_KEYS) {
    delete cleaned[key];
  }
  return cleaned;
};

const normalizeStates = (states: string[] | undefined): string[] => {
  return (states || [])
    .map((state: string) => {
      const match = state.match(/\(([^)]+)\)/);
      const key = match ? match[1] : state;
      const normalizedState = ALL_STATES_FLATTENED.find((s: { label: string; value: string }) =>
        s.label.includes(key)
      );
      return normalizedState?.value || null;
    })
    .filter((code: string | null) => code !== null) as string[];
};

const userInclude = (as: string) => ({
  model: db.User,
  as,
  attributes: ['fullName', 'name', 'id'],
  include: [
    {
      model: db.Role,
      as: 'roles',
      attributes: ['name'],
    },
  ],
});

const updateSessionReportRelatedModels = async (
  sessionReportId: number,
  joinTableModel: typeof SessionReportPilotGoalTemplate,
  relatedModelForeignKey: string,
  relatedModelForeignKeyIds: number[]
) => {
  // First, remove any existing associations not in the new list.
  await joinTableModel.destroy({
    where: {
      sessionReportPilotId: sessionReportId,
      [relatedModelForeignKey]: { [Op.notIn]: relatedModelForeignKeyIds },
    },
  });

  // Next, add new associations.
  const existingAssociations = await joinTableModel.findAll({
    attributes: ['id', relatedModelForeignKey],
    where: {
      sessionReportPilotId: sessionReportId,
      [relatedModelForeignKey]: { [Op.in]: relatedModelForeignKeyIds },
    },
  });

  const existingForeignKeyIds = existingAssociations.map(
    (assoc: { [key: string]: number }) => assoc[relatedModelForeignKey]
  );

  const newAssociations = relatedModelForeignKeyIds
    .filter((key) => !existingForeignKeyIds.includes(key))
    .map((key) => ({
      sessionReportPilotId: sessionReportId,
      [relatedModelForeignKey]: key,
    }));

  if (newAssociations.length > 0) {
    await joinTableModel.bulkCreate(newAssociations, {
      individualHooks: true,
      ignoreDuplicates: true,
    });
  }
};

export const validateFields = (request, requiredFields: string[]) => {
  const missingFields = requiredFields.filter((field) => !request[field]);

  if (missingFields.length) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }
};

export async function destroySession(id: number): Promise<void> {
  // Delete files.
  await SessionReportPilotFile.destroy(
    { where: { sessionReportPilotId: id } },
    { individualHooks: true }
  );

  // Delete supporting attachments.
  await SessionReportPilotSupportingAttachment.destroy(
    { where: { sessionReportPilotId: id } },
    { individualHooks: true }
  );

  // Delete session.
  await SessionReportPilot.destroy({ where: { id } }, { individualHooks: true });
}

// eslint-disable-next-line max-len
export async function findSessionHelper(
  where: WhereOptions,
  plural = false
): Promise<SessionReportShape | SessionReportShape[] | null> {
  const query = {
    attributes: [
      'id',
      'eventId',
      'data',
      'updatedAt',
      'approverId',
      'submitterId',
      'submitted',
      'startDate',
      'endDate',
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
        model: db.GoalTemplate,
        as: 'goalTemplates',
        attributes: ['id', 'standard'],
        through: { attributes: [] }, // exclude join table attributes
      },
      {
        ...userInclude('trainers'),
        through: { attributes: [] }, // exclude join table attributes
      },
      userInclude('approver'),
      userInclude('submitter'),
    ],
  };

  const session = plural
    ? await SessionReportPilot.findAll(query)
    : await SessionReportPilot.findOne(query);

  if (!session) {
    return null;
  }

  if (Array.isArray(session)) {
    return (session as Model[]).map((s) => {
      const sd = s.get('startDate') as string | null;
      const ed = s.get('endDate') as string | null;
      return {
        ...s.get({ plain: true }),
        data: {
          ...((s.get('data') as Record<string, unknown>) ?? {}),
          startDate: sd ? moment(sd, 'YYYY-MM-DD').format('MM/DD/YYYY') : '',
          endDate: ed ? moment(ed, 'YYYY-MM-DD').format('MM/DD/YYYY') : '',
        },
      };
    }) as unknown as SessionReportShape[];
  }

  const eventId = session?.event?.data?.eventId ?? null;

  const startDate = session?.startDate
    ? moment(session.startDate as string, 'YYYY-MM-DD').format('MM/DD/YYYY')
    : '';
  const endDate = session?.endDate
    ? moment(session.endDate as string, 'YYYY-MM-DD').format('MM/DD/YYYY')
    : '';

  return {
    id: session?.id,
    eventId,
    data: {
      ...((session?.data as Record<string, unknown>) ?? {}),
      startDate,
      endDate,
    },
    files: session?.files ?? [],
    supportingAttachments: session?.supportingAttachments ?? [],
    goalTemplates: session?.goalTemplates ?? [],
    updatedAt: session?.updatedAt,
    event: session?.event,
    approverId: session?.approverId ?? null,
    approver: session?.approver ?? null,
    submitted: session?.submitted ?? false,
    submitterId: session?.submitterId ?? null,
    submitter: session?.submitter ?? null,
    trainers: session?.trainers ?? [],
  };
}

export async function createSession(request) {
  validateFields(request, ['eventId', 'data']);

  const { eventId, data } = request;

  const event = await findEventByDbId(eventId);

  if (!event) {
    throw new Error(`Event with id ${eventId} not found`);
  }

  const cleanData = removeAssociationsFromData(data);
  const { startDate, endDate, ...restData } = cleanData;

  const created = await SessionReportPilot.create(
    {
      eventId: event.id,
      startDate: parseDate(startDate as string),
      endDate: parseDate(endDate as string),
      data: cast(
        JSON.stringify({
          ...restData,
          reviewStatus: REPORT_STATUSES.DRAFT,
          additionalStates: event.data.additionalStates || [],
          additionalRegions: event.data.additionalRegions || [],
        }),
        'jsonb'
      ),
    },
    {
      individualHooks: true,
    }
  );

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

  const {
    eventId,
    data: { approverId, goalTemplates, submitterId, trainers, ...data },
  } = request;

  // Combine existing session data with new data. The dedicated startDate/endDate
  // columns are the source of truth; the JSONB `data` keeps a mirror that is
  // re-derived from the columns on read (see findSessionHelper).
  const existingData = session.data as Record<string, unknown>;
  const { startDate, endDate, ...restExistingData } = existingData;
  const cleanIncomingData = removeAssociationsFromData(data);
  const {
    startDate: incomingStartDate,
    endDate: incomingEndDate,
    ...restIncomingData
  } = cleanIncomingData;
  const newData = { ...restExistingData, ...restIncomingData };

  const event = await findEventBySmartsheetId(eventId);

  const hasStartDate = Object.prototype.hasOwnProperty.call(cleanIncomingData, 'startDate');
  const hasEndDate = Object.prototype.hasOwnProperty.call(cleanIncomingData, 'endDate');

  const update = {
    eventId: event.id,
    startDate: hasStartDate
      ? (parseDate(incomingStartDate as string | null | undefined) as Date | null)
      : (session.get('startDate') as unknown as Date | null),
    endDate: hasEndDate
      ? (parseDate(incomingEndDate as string | null | undefined) as Date | null)
      : (session.get('endDate') as unknown as Date | null),
    data: cast(JSON.stringify(newData), 'jsonb'),
  } as {
    eventId: number;
    approverId?: number;
    submitterId?: number;
    startDate?: Date | null;
    endDate?: Date | null;
    data: Cast;
  };

  if (approverId) {
    update.approverId = Number(approverId);
  }

  if (submitterId) {
    update.submitterId = Number(submitterId);
  }

  await SessionReportPilot.update(update, {
    where: { id },
    individualHooks: true,
  });

  if (goalTemplates) {
    await updateSessionReportRelatedModels(
      id,
      SessionReportPilotGoalTemplate,
      'goalTemplateId',
      goalTemplates.map((template: { id: number }) => template.id)
    );
  }

  if (trainers) {
    await updateSessionReportRelatedModels(
      id,
      SessionReportPilotTrainer,
      'userId',
      trainers
        .map((trainer: { id: number | 'other' }) => trainer.id)
        .filter((id: number | 'other') => id !== 'other')
    );
  }

  return findSessionHelper({ id }) as Promise<SessionReportShape>;
}

export async function findSessionById(id: number): Promise<SessionReportShape> {
  return findSessionHelper({ id }) as Promise<SessionReportShape>;
}

export async function findSessionsByEventId(eventId): Promise<SessionReportShape[]> {
  return findSessionHelper({ eventId }, true) as Promise<SessionReportShape[]>;
}

export async function getPossibleSessionParticipants(
  sessionReportId: number
): Promise<{ id: number; name: string }[]> {
  const where = {
    status: 'Active',
  } as {
    status: string;
    regionId?: { [Op.in]: number[] };
    [Op.or]?: {
      regionId?: { [Op.in]: number[] };
      '$grants.stateCode$'?: string[];
    }[];
  };

  const event = await db.EventReportPilot.findOne({
    attributes: ['data', 'regionId'],
    include: [
      {
        model: db.SessionReportPilot,
        as: 'sessionReports',
        attributes: [],
        where: { id: sessionReportId },
        required: true,
      },
    ],
  });

  const regionId = event?.regionId;
  const additionalRegions = event?.data?.additionalRegions;
  const states = normalizeStates(event?.data?.additionalStates);

  const whereRegions = [regionId, ...(additionalRegions || [])];

  if (states && states.length > 0) {
    where[Op.or] = [
      { regionId: { [Op.in]: whereRegions.map(Number) } },
      { '$grants.stateCode$': states },
    ];
  } else {
    where.regionId = { [Op.in]: whereRegions.map(Number) };
  }

  return db.Recipient.findAll({
    attributes: ['id', 'name'],
    order: ['name'],
    include: [
      {
        where,
        model: db.Grant,
        as: 'grants',
        attributes: ['id', 'name', 'number', 'regionId', 'stateCode'],
        include: [
          {
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
      },
    ],
  });
}

function removeRegionFilters(filters: Record<string, unknown>): Record<string, unknown> {
  return Object.keys(filters || {}).reduce((acc, key) => {
    if (key === 'region.in' || key === 'region.in[]' || key === 'region.nin') {
      return acc;
    }

    return {
      ...acc,
      [key]: filters[key],
    };
  }, {});
}

function recipientGrantFilter(grantIds: number[]) {
  return sequelize.literal(`EXISTS (
    SELECT 1
    FROM jsonb_array_elements("SessionReportPilot"."data"->'recipients') elem
    WHERE (
      jsonb_typeof(elem->'value') = 'number'
      OR (jsonb_typeof(elem->'value') = 'string' AND elem->>'value' ~ '^[0-9]+$')
    )
    AND (elem->>'value')::integer IN (${grantIds.join(', ')})
  )`);
}

// Map frontend column header keys (HorizontalTableWidget sends displayName.replaceAll(' ', '_')) to backend sort keys
const sessionReportSortByAliases: Record<string, string> = {
  Session_name: 'sessionName',
  Session_start_date: 'startDate',
  Session_end_date: 'endDate',
  Event_ID: 'eventId',
  Event_title: 'eventName',
  Supporting_goals: 'supportingGoals',
  Topics: 'topics',
};

function sessionReportOrderClause(sortBy: string, sortDir: string) {
  const resolvedSortBy = sessionReportSortByAliases[sortBy] || sortBy;

  // Define allowed sort columns with their actual database paths
  const sortMap: SessionReportSortSortMap = {
    id: ['id'],
    sessionName: [sequelize.literal('("SessionReportPilot".data->>\'sessionName\')::text')],
    startDate: [sequelize.literal(sessionReportDateSort('startDate'))],
    endDate: [sequelize.literal(sessionReportDateSort('endDate'))],
    eventId: ['event', 'eventId'],
    eventName: ['event', sequelize.literal("data->>'eventName'::text")],
    supportingGoals: [
      sequelize.literal(
        '(SELECT MIN(gt.standard) FROM "SessionReportPilotGoalTemplates" srpgt JOIN "GoalTemplates" gt ON srpgt."goalTemplateId" = gt.id WHERE srpgt."sessionReportPilotId" = "SessionReportPilot".id)'
      ),
    ],
    topics: [sequelize.literal('("SessionReportPilot".data->\'objectiveTopics\'->>0)::text')],
  };

  // Use the requested sort column or default to id descending
  const sortEntry = sortMap[resolvedSortBy] || sortMap.id;
  return [[...sortEntry, sortDir]];
}

const sessionReportAttributes = [
  'id',
  [sequelize.literal('"event"."eventId"'), 'eventId'],
  [sequelize.literal('"event"."data"->>\'eventName\''), 'eventName'],
  [sequelize.literal('"SessionReportPilot"."data"->>\'sessionName\''), 'sessionName'],
  'startDate',
  'endDate',
  [sequelize.literal('"SessionReportPilot"."data"->\'objectiveTopics\''), 'objectiveTopics'],
  [sequelize.literal('"SessionReportPilot"."data"->\'recipients\''), 'recipients'],
  [sequelize.literal('"SessionReportPilot"."data"->\'participants\''), 'participants'],
  [sequelize.literal('"SessionReportPilot"."data"->\'duration\''), 'duration'],
];

/**
 * Shared implementation backing getSessionReports and getSessionReportsByRecipient.
 * `extraWhereClauses` allows callers (e.g. the recipient-scoped variant) to layer
 * additional restrictions onto both the ID-selection query and the final data query.
 */
async function fetchSessionReports(
  filterParams: Record<string, unknown>,
  {
    sortBy = 'id',
    sortDir = 'DESC',
    offset = 0,
    limit = 10 as number | 'all',
    extraWhereClauses = [] as unknown[],
  }
): Promise<GetSessionReportsResponse> {
  const orderClause = sessionReportOrderClause(sortBy, sortDir);

  // Get scopes from filters
  const { trainingReport: trainingReportScopes, sessionReport: sessionReportScopes } =
    await filtersToScopes(filterParams, {});

  // Get events to pass into session query
  // (the scopes construction makes this necessary, sadly)
  const events = await EventReportPilot.findAll({
    attributes: ['id'],
    where: {
      [Op.and]: [
        ...trainingReportScopes,
        {
          data: {
            status: {
              [Op.in]: [TRAINING_REPORT_STATUSES.COMPLETE, TRAINING_REPORT_STATUSES.IN_PROGRESS],
            },
          },
        },
      ],
    },
  });

  const baseWhere = {
    eventId: events.map(({ id }) => id),
    data: {
      status: TRAINING_REPORT_STATUSES.COMPLETE,
    },
  };

  // First get the IDs of sessions for this page (without the goalTemplates join
  // which inflates row counts and breaks LIMIT/OFFSET)
  const idQuery = {
    attributes: ['id'],
    where: {
      [Op.and]: [baseWhere, ...sessionReportScopes, ...extraWhereClauses],
    },
    include: [
      {
        model: EventReportPilot,
        as: 'event',
        attributes: [],
        required: true,
      },
    ],
    order: orderClause,
    subQuery: false,
    offset,
  } as Record<string, unknown>;

  if (limit !== 'all') {
    idQuery.limit = limit;
  }

  const { count, rows: idRows } = await SessionReportPilot.findAndCountAll(idQuery);
  const sessionIds = idRows.map((r: Model) => r.get('id'));

  // Now fetch full data for just those IDs (with goalTemplates)
  const result = await SessionReportPilot.findAll({
    attributes: sessionReportAttributes,
    where: {
      [Op.and]: [{ id: sessionIds }, ...sessionReportScopes, ...extraWhereClauses],
    },
    include: [
      {
        model: EventReportPilot,
        as: 'event',
        attributes: [],
        required: true,
      },
      {
        model: db.GoalTemplate,
        as: 'goalTemplates',
        attributes: ['standard'],
        through: { attributes: [] },
        required: false,
      },
    ],
    order: orderClause,
    subQuery: false,
  });

  // Transform rows to plain objects with goalTemplates included
  const rows = result.map((row: Model) => {
    const plain = row.get({ plain: true });
    return {
      id: plain.id,
      eventId: plain.eventId,
      eventName: plain.eventName,
      sessionName: plain.sessionName,
      startDate: plain.startDate,
      endDate: plain.endDate,
      objectiveTopics: plain.objectiveTopics,
      goalTemplates: plain.goalTemplates || [],
      duration: plain.duration,
      recipients: plain.recipients,
      participants: plain.participants,
    };
  });

  return {
    count,
    rows,
  };
}

/**
 * Get training reports (sessions) with pagination, sorting, and filtering
 * @param params Query parameters including pagination, sorting, filtering, and format
 * @returns JSON object with count and rows
 */
export async function getSessionReports(
  params: GetSessionReportsParams
): Promise<GetSessionReportsResponse> {
  const { sortBy = 'id', sortDir = 'DESC', offset = 0, limit = 10, ...filterParams } = params;

  return fetchSessionReports(filterParams, { sortBy, sortDir, offset, limit });
}

/**
 * Variant of getSessionReports that filters rows to sessions listing grants
 * from a specific recipient, and ignores any region restrictions.
 */
export async function getSessionReportsByRecipient(
  params: GetSessionReportsForRecipientParams
): Promise<GetSessionReportsResponse> {
  const {
    recipientId,
    sortBy = 'id',
    sortDir = 'DESC',
    offset = 0,
    limit = 10,
    ...filterParams
  } = params;

  const parsedRecipientId = Number(recipientId);
  if (!Number.isInteger(parsedRecipientId) || parsedRecipientId <= 0) {
    throw new Error('recipientId must be a positive integer');
  }

  const grants = (await Grant.findAll({
    attributes: ['id'],
    where: { recipientId: parsedRecipientId },
    raw: true,
  })) as { id: number }[];

  // Validate grant ids independently before interpolation into SQL literal.
  const grantIds = [...new Set(grants.map((g) => Number(g.id)))].filter(
    (id) => Number.isInteger(id) && id > 0
  );

  if (grantIds.length === 0) {
    return {
      count: 0,
      rows: [],
    };
  }

  // Explicitly ignore all region filters/restrictions for recipient-based query.
  const regionlessFilterParams = removeRegionFilters(filterParams as Record<string, unknown>);

  return fetchSessionReports(regionlessFilterParams, {
    sortBy,
    sortDir,
    offset,
    limit,
    extraWhereClauses: [recipientGrantFilter(grantIds)],
  });
}
