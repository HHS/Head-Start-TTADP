import { cast, Op, type Model } from 'sequelize'
import type { Cast } from 'sequelize/types/utils'
import { REPORT_STATUSES, TRAINING_REPORT_STATUSES } from '@ttahub/common'
import db, { sequelize } from '../models'
import type { SessionReportShape, GetSessionReportsResponse, GetSessionReportsParams, SessionReportSortSortMap } from './types/sessionReport'
import { findEventBySmartsheetIdSuffix, findEventByDbId } from './event'
import filtersToScopes from '../scopes'

const {
  SessionReportPilot,
  EventReportPilot,
  SessionReportPilotFile,
  SessionReportPilotSupportingAttachment,
  SessionReportPilotGoalTemplate,
  SessionReportPilotTrainer,
} = db

type WhereOptions = {
  id?: number
  eventId?: number
  data?: unknown
}

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
})

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
  })

  // Next, add new associations.
  const existingAssociations = await joinTableModel.findAll({
    attributes: ['id', relatedModelForeignKey],
    where: {
      sessionReportPilotId: sessionReportId,
      [relatedModelForeignKey]: { [Op.in]: relatedModelForeignKeyIds },
    },
  })

  const existingForeignKeyIds = existingAssociations.map((assoc: { [key: string]: number }) => assoc[relatedModelForeignKey])

  const newAssociations = relatedModelForeignKeyIds
    .filter((key) => !existingForeignKeyIds.includes(key))
    .map((key) => ({
      sessionReportPilotId: sessionReportId,
      [relatedModelForeignKey]: key,
    }))

  if (newAssociations.length > 0) {
    await joinTableModel.bulkCreate(newAssociations, {
      individualHooks: true,
      ignoreDuplicates: true,
    })
  }
}

export const validateFields = (request, requiredFields: string[]) => {
  const missingFields = requiredFields.filter((field) => !request[field])

  if (missingFields.length) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`)
  }
}

export async function destroySession(id: number): Promise<void> {
  // Delete files.
  await SessionReportPilotFile.destroy({ where: { sessionReportPilotId: id } }, { individualHooks: true })

  // Delete supporting attachments.
  await SessionReportPilotSupportingAttachment.destroy({ where: { sessionReportPilotId: id } }, { individualHooks: true })

  // Delete session.
  await SessionReportPilot.destroy({ where: { id } }, { individualHooks: true })
}

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
  }

  const session = plural ? await SessionReportPilot.findAll(query) : await SessionReportPilot.findOne(query)

  if (!session) {
    return null
  }

  if (Array.isArray(session)) {
    return session
  }

  const eventId = (() => {
    if (session.event) {
      const fullId = session.event.data.eventId
      // we need to get the last four digits of the smartsheet provided
      // event id, which is in the format R01-PD-1037
      return fullId.substring(fullId.lastIndexOf('-') + 1)
    }

    return null
  })()

  return {
    id: session?.id,
    eventId,
    data: session?.data ?? {},
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
  }
}

export async function createSession(request) {
  validateFields(request, ['eventId', 'data'])

  const { eventId, data } = request

  const event = await findEventByDbId(eventId)

  if (!event) {
    throw new Error(`Event with id ${eventId} not found`)
  }

  const created = await SessionReportPilot.create(
    {
      eventId: event.id,
      data: cast(
        JSON.stringify({
          ...data,
          reviewStatus: REPORT_STATUSES.DRAFT,
          additionalStates: event.data.additionalStates || [],
        }),
        'jsonb'
      ),
    },
    {
      individualHooks: true,
    }
  )

  return findSessionHelper({ id: created.dataValues.id }) as Promise<SessionReportShape>
}

export async function updateSession(id: number, request) {
  const session = await SessionReportPilot.findOne({
    where: { id },
  })

  if (!session) {
    return createSession(request)
  }

  validateFields(request, ['eventId', 'data'])

  const {
    eventId,
    data: { approverId, goalTemplates, submitterId, trainers, ...data },
  } = request

  // Combine existing session data with new data.
  const existingData = session.data
  const newData = { ...existingData, ...data }

  const event = await findEventBySmartsheetIdSuffix(eventId)

  const update = {
    eventId: event.id,
    data: cast(JSON.stringify(newData), 'jsonb'),
  } as {
    eventId: number
    approverId?: number
    submitterId?: number
    data: Cast
  }

  if (approverId) {
    update.approverId = Number(approverId)
  }

  if (submitterId) {
    update.submitterId = Number(submitterId)
  }

  await SessionReportPilot.update(update, {
    where: { id },
    individualHooks: true,
  })

  if (goalTemplates) {
    await updateSessionReportRelatedModels(
      id,
      SessionReportPilotGoalTemplate,
      'goalTemplateId',
      goalTemplates.map((template: { id: number }) => template.id)
    )
  }

  if (trainers) {
    await updateSessionReportRelatedModels(
      id,
      SessionReportPilotTrainer,
      'userId',
      trainers.map((trainer: { id: number }) => trainer.id)
    )
  }

  if (trainers) {
    await updateSessionReportRelatedModels(
      id,
      SessionReportPilotTrainer,
      'userId',
      trainers.map((trainer: { id: number }) => trainer.id)
    )
  }

  return findSessionHelper({ id }) as Promise<SessionReportShape>
}

export async function findSessionById(id: number): Promise<SessionReportShape> {
  return findSessionHelper({ id }) as Promise<SessionReportShape>
}

export async function findSessionsByEventId(eventId): Promise<SessionReportShape[]> {
  return findSessionHelper({ eventId }, true) as Promise<SessionReportShape[]>
}

export async function getPossibleSessionParticipants(regionId: number, states?: string[]): Promise<{ id: number; name: string }[]> {
  const where = {
    status: 'Active',
  } as {
    status: string
    regionId?: number
    [Op.or]?: {
      regionId?: number
      '$grants.stateCode$'?: string[]
    }[]
  }

  if (states && states.length > 0) {
    where[Op.or] = [{ regionId }, { '$grants.stateCode$': states }]
  } else {
    where.regionId = regionId
  }

  return db.Recipient.findAll({
    attributes: ['id', 'name'],
    order: ['name'],
    include: [
      {
        where,
        model: db.Grant,
        as: 'grants',
        attributes: ['id', 'name', 'number'],
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
  })
}

/**
 * Get training reports (sessions) with pagination, sorting, and filtering
 * @param params Query parameters including pagination, sorting, filtering, and format
 * @returns JSON object with count and rows
 */
export async function getSessionReports(params: GetSessionReportsParams): Promise<GetSessionReportsResponse> {
  const { sortBy = 'id', sortDir = 'DESC', offset = 0, limit = 10, format = 'json', ...filterParams } = params

  // Map frontend column header keys to backend sort keys
  // The frontend HorizontalTableWidget sends displayName.replaceAll(' ', '_') as sortBy
  const sortByAliases: Record<string, string> = {
    Session_name: 'sessionName',
    Session_start_date: 'startDate',
    Session_end_date: 'endDate',
    Event_ID: 'eventId',
    Event_title: 'eventName',
    Supporting_goals: 'supportingGoals',
    Topics: 'topics',
  }

  const resolvedSortBy = sortByAliases[sortBy] || sortBy

  // Define allowed sort columns with their actual database paths
  const sortMap: SessionReportSortSortMap = {
    id: ['id'],
    sessionName: [sequelize.literal('("SessionReportPilot".data->>\'sessionName\')::text')],
    startDate: [sequelize.literal('CAST("SessionReportPilot".data->>\'startDate\' AS DATE)')],
    endDate: [sequelize.literal('CAST("SessionReportPilot".data->>\'endDate\' AS DATE)')],
    eventId: ['event', sequelize.literal("data->>'eventId'::text")],
    eventName: ['event', sequelize.literal("data->>'eventName'::text")],
    supportingGoals: [
      sequelize.literal(
        '(SELECT MIN(gt.standard) FROM "SessionReportPilotGoalTemplates" srpgt JOIN "GoalTemplates" gt ON srpgt."goalTemplateId" = gt.id WHERE srpgt."sessionReportPilotId" = "SessionReportPilot".id)'
      ),
    ],
    topics: [sequelize.literal('("SessionReportPilot".data->\'objectiveTopics\'->>0)::text')],
  }

  // Use the requested sort column or default to id descending
  const sortEntry = sortMap[resolvedSortBy] || sortMap.id
  const orderClause = [[...sortEntry, sortDir]]

  // Get scopes from filters
  const { trainingReport: trainingReportScopes, sessionReport: sessionReportScopes } = await filtersToScopes(filterParams, {})

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
  })

  // Build query options
  const queryOptions = {
    attributes: [
      'id',
      [sequelize.literal('"event"."data"->>\'eventId\''), 'eventId'],
      [sequelize.literal('"event"."data"->>\'eventName\''), 'eventName'],
      [sequelize.literal('"SessionReportPilot"."data"->>\'sessionName\''), 'sessionName'],
      [sequelize.literal('"SessionReportPilot"."data"->>\'startDate\''), 'startDate'],
      [sequelize.literal('"SessionReportPilot"."data"->>\'endDate\''), 'endDate'],
      [sequelize.literal('"SessionReportPilot"."data"->\'objectiveTopics\''), 'objectiveTopics'],
      [sequelize.literal('"SessionReportPilot"."data"->\'recipients\''), 'recipients'],
      [sequelize.literal('"SessionReportPilot"."data"->\'participants\''), 'participants'],
      [sequelize.literal('"SessionReportPilot"."data"->\'duration\''), 'duration'],
    ],
    where: {
      eventId: events.map(({ id }) => id),
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
    subQuery: true,
    distinct: true,
  } as Record<string, unknown>

  queryOptions.offset = offset

  if (limit !== 'all') {
    queryOptions.limit = limit
  }

  // First get the IDs of sessions for this page (without the goalTemplates join
  // which inflates row counts and breaks LIMIT/OFFSET)
  const idQuery = {
    attributes: ['id'],
    where: {
      [Op.and]: [queryOptions.where, ...sessionReportScopes],
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
  } as Record<string, unknown>

  if (limit !== 'all') {
    idQuery.limit = limit
  }

  const { count, rows: idRows } = await SessionReportPilot.findAndCountAll(idQuery)
  const sessionIds = idRows.map((r: Model) => r.get('id'))

  // Now fetch full data for just those IDs (with goalTemplates)
  const result = await SessionReportPilot.findAll({
    attributes: queryOptions.attributes,
    where: {
      [Op.and]: [{ id: sessionIds }, ...sessionReportScopes],
    },
    include: queryOptions.include,
    order: orderClause,
    subQuery: false,
  })

  // Transform rows to plain objects with goalTemplates included
  const rows = result.map((row: Model) => {
    const plain = row.get({ plain: true })
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
    }
  })

  return {
    count,
    rows,
  }
}
