import { Op } from 'sequelize'
import { REPORT_STATUSES, DECIMAL_BASE } from '@ttahub/common'
import { uniq, uniqBy } from 'lodash'
import {
  Grant,
  GrantReplacements,
  Recipient,
  CollaboratorType,
  Program,
  sequelize,
  Goal,
  GoalCollaborator,
  GoalFieldResponse,
  GoalStatusChange,
  GoalTemplate,
  ActivityReport,
  Objective,
  Topic,
  Permission,
  ProgramPersonnel,
  User,
  UserRole,
  Role,
  ActivityReportCollaborator,
  ActivityReportApprover,
  ActivityReportObjective,
  GoalTemplateFieldPrompt,
  ActivityReportObjectiveCitation,
} from '../models'
import orderRecipientsBy from '../lib/orderRecipientsBy'
import { RECIPIENTS_PER_PAGE, GOALS_PER_PAGE, GOAL_STATUS, CREATION_METHOD } from '../constants'
import filtersToScopes, { mergeIncludes } from '../scopes'
import orderGoalsBy from '../lib/orderGoalsBy'
import goalStatusByGoalName from '../widgets/goalStatusByGoalName'
import { responsesForComparison } from '../goalServices/helpers'
import getCachedResponse from '../lib/cache'
import ensureArray from '../lib/utils'

export async function allArUserIdsByRecipientAndRegion(recipientId, regionId) {
  const reports = await ActivityReport.findAll({
    include: [
      {
        model: ActivityReportCollaborator,
        as: 'activityReportCollaborators',
      },
      {
        model: ActivityReportApprover,
        as: 'approvers',
      },
      {
        model: Grant,
        as: 'grants',
        where: {
          regionId,
          status: 'Active',
        },
        required: true,
        include: [
          {
            model: Recipient,
            as: 'recipient',
            where: {
              id: recipientId,
            },
            required: true,
          },
        ],
      },
    ],
  })

  return uniq([
    ...reports.map((r) => r.userId),
    ...reports.flatMap((r) => r.activityReportCollaborators.map((c) => c.userId)),
    ...reports.flatMap((r) => r.approvers.map((a) => a.userId)),
  ])
}

/**
 *
 * @param {number} userId
 * @returns {Promise<Model>} recipient results
 */
export async function recipientsByUserId(userId) {
  const user = await User.findOne({
    attributes: ['id'],
    where: {
      id: userId,
    },
    include: [
      {
        model: Permission,
        as: 'permissions',
      },
    ],
  })

  if (!user) {
    return []
  }

  const regions = user.permissions.map((p) => p.regionId)

  return Recipient.findAll({
    order: [['name', 'ASC']],
    include: [
      {
        model: Grant,
        as: 'grants',
        where: {
          regionId: regions,
          status: 'Active',
        },
      },
    ],
  })
}

export async function allRecipients() {
  return Recipient.findAll({
    where: {
      [Op.or]: [
        { '$grants.replacedGrantReplacements.replacementDate$': null },
        { '$grants.replacedGrantReplacements.replacementDate$': { [Op.gt]: '2020-08-31' } },
        { '$grants.replacingGrantReplacements.replacementDate$': null },
        { '$grants.replacingGrantReplacements.replacementDate$': { [Op.gt]: '2020-08-31' } },
      ],
    },
    include: [
      {
        attributes: ['id', 'number', 'regionId'],
        model: Grant,
        as: 'grants',
        where: {
          [Op.and]: [{ deleted: { [Op.ne]: true } }, { endDate: { [Op.gt]: '2020-08-31' } }],
        },
        include: [
          {
            model: GrantReplacements,
            as: 'replacedGrantReplacements',
            attributes: [],
          },
          {
            model: GrantReplacements,
            as: 'replacingGrantReplacements',
            attributes: [],
          },
        ],
      },
    ],
  })
}

export async function recipientById(recipientId, grantScopes) {
  const grantsWhereCondition = grantScopes?.where ? grantScopes.where : {}
  return Recipient.findOne({
    attributes: ['id', 'name', 'recipientType', 'uei'],
    where: {
      id: recipientId,
      [Op.or]: [
        { '$grants.replacedGrantReplacements.replacementDate$': null },
        { '$grants.replacedGrantReplacements.replacementDate$': { [Op.gt]: '2020-08-31' } },
        { '$grants.replacingGrantReplacements.replacementDate$': null },
        { '$grants.replacingGrantReplacements.replacementDate$': { [Op.gt]: '2020-08-31' } },
      ],
    },
    include: [
      {
        attributes: [
          'id',
          'number',
          'regionId',
          'status',
          'startDate',
          'endDate',
          'programSpecialistName',
          'grantSpecialistName',
          'recipientId',
          'annualFundingMonth',
          'numberWithProgramTypes',
        ],
        model: Grant.unscoped(),
        as: 'grants',
        where: [
          {
            [Op.and]: [
              { [Op.and]: grantsWhereCondition },
              { deleted: { [Op.ne]: true } },
              {
                [Op.or]: [{ status: 'Active' }, { [Op.and]: [{ endDate: { [Op.gt]: '2020-08-31' } }] }],
              },
            ],
          },
        ],
        include: [
          {
            attributes: ['name', 'programType'],
            model: Program,
            as: 'programs',
          },
          {
            model: GrantReplacements,
            as: 'replacedGrantReplacements',
            attributes: [],
          },
          {
            model: GrantReplacements,
            as: 'replacingGrantReplacements',
            attributes: [],
          },
        ],
      },
    ],
    order: [
      [{ model: Grant, as: 'grants' }, 'status', 'ASC'],
      [{ model: Grant, as: 'grants' }, 'endDate', 'DESC'],
      [{ model: Grant, as: 'grants' }, 'number', 'ASC'],
    ],
  })
}

export async function missingStandardGoals(recipient, grantScopes) {
  // Get all the goal templates and join them to any existing goals for the recipient.
  const grantsWhereCondition = grantScopes?.where ? grantScopes.where : {}
  const goalTemplatesWithGoals = await GoalTemplate.findAll({
    attributes: ['id', 'templateName'],
    where: {
      creationMethod: CREATION_METHOD.CURATED,
      // And standard is not equal to 'Monitoring'.
      [Op.and]: [{ standard: { [Op.ne]: 'Monitoring' } }],
    },
    include: [
      {
        model: Goal,
        as: 'goals',
        attributes: ['id', 'grantId'],
        required: false,
        include: [
          {
            model: Grant,
            as: 'grant',
            attributes: ['id'],
            required: false,
            where: {
              ...grantsWhereCondition,
              recipientId: recipient.id,
              status: 'Active',
            },
          },
        ],
      },
    ],
  })

  // Get all the grantIds from the recipient object.
  const grantIds = recipient.grants.filter((g) => g.status === 'Active').map((g) => g.id)
  if (!grantIds.length) {
    return []
  }

  const templatesByName = goalTemplatesWithGoals.reduce((acc, template) => {
    if (!acc[template.templateName]) {
      acc[template.templateName] = []
    }

    acc[template.templateName].push(template)
    return acc
  }, {})

  // Make sure every distinct template name and grantId has a goal, return the missing ones.
  // Step 1: Initialize the result array
  const missingGoals = []

  // Step 2: For each distinct template name
  Object.entries(templatesByName).forEach(([templateName, templates]) => {
    // Track all grant ids that already have this template name.
    const grantIdsWithTemplate = new Set()
    templates.forEach((template) => {
      template.goals.forEach((goal) => {
        if (goal.grantId) {
          grantIdsWithTemplate.add(goal.grantId)
        }
      })
    })

    // Step 4: For each grant ID make sure this template exists on that grant.
    grantIds.forEach((grantId) => {
      if (!grantIdsWithTemplate.has(grantId)) {
        missingGoals.push({
          goalTemplateId: templates[0]?.id,
          templateName,
          grantId,
        })
      }
    })
  })
  // Step 7: Return the list of missing goals
  return missingGoals
}

/**
 *
 * @param {string} query
 * @param {number} regionId
 * @param {string} sortBy
 * @param {number[]} userRegions
 *
 * @returns {Promise} recipient results
 */
export async function recipientsByName(query, scopes, sortBy, direction, offset, userRegions) {
  // fix the query
  const q = `%${query}%`
  const limit = RECIPIENTS_PER_PAGE

  const rows = await Recipient.findAll({
    attributes: [
      [sequelize.literal('DISTINCT COUNT(*) OVER()'), 'count'],
      sequelize.literal(
        'STRING_AGG(DISTINCT "grants"."programSpecialistName", \', \' order by "grants"."programSpecialistName") as "programSpecialists"'
      ),
      sequelize.literal('STRING_AGG(DISTINCT "grants"."grantSpecialistName", \', \' order by "grants"."grantSpecialistName") as "grantSpecialists"'),
      [sequelize.col('grants.regionId'), 'regionId'],
      'id',
      'name',
      'recipientType',
    ],
    where: {
      [Op.or]: [
        {
          name: {
            [Op.iLike]: q,
          },
        },
        {
          [Op.and]: [{ '$grants.number$': { [Op.iLike]: q } }],
        },
      ],
      [Op.and]: [
        { '$grants.deleted$': { [Op.ne]: true } },
        {
          [Op.and]: { '$grants.regionId$': userRegions },
        },
        {
          [Op.or]: [
            {
              '$grants.status$': 'Active',
            },
            {
              [Op.and]: [
                {
                  '$grants.endDate$': {
                    [Op.gt]: '2020-08-31',
                  },
                },
                {
                  [Op.or]: [
                    { '$grants.replacedGrantReplacements.replacementDate$': null },
                    {
                      '$grants.replacedGrantReplacements.replacementDate$': {
                        [Op.gt]: '2020-08-31',
                      },
                    },
                    { '$grants.replacingGrantReplacements.replacementDate$': null },
                    {
                      '$grants.replacingGrantReplacements.replacementDate$': {
                        [Op.gt]: '2020-08-31',
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    include: [
      {
        attributes: [],
        model: Grant.unscoped(),
        as: 'grants',
        required: true,
        where: scopes.where,
        include: [
          ...mergeIncludes(scopes.include, [
            {
              model: GrantReplacements,
              as: 'replacedGrantReplacements',
              attributes: [],
            },
            {
              model: GrantReplacements,
              as: 'replacingGrantReplacements',
              attributes: [],
            },
          ]),
        ],
      },
    ],
    subQuery: false,
    raw: true,
    group: ['grants.regionId', 'Recipient.id', 'Recipient.name'],
    limit,
    offset,
    order: orderRecipientsBy(sortBy, direction),
  })

  // handle zero results
  const firstRow = rows[0]
  const count = firstRow ? firstRow.count : 0

  return {
    count: parseInt(count, 10),
    rows,
  }
}

/**
 * Some of the topics on an objective
 * are strings (those from old activity reports)
 * and some are objects (retrieved from the ObjectiveTopics linkage)
 *
 * In addition to this complication, because we have to deduplicate objectives within a goal,
 * we can iterate over an objective multiple times. This makes deduplicating and formatting
 * the topics a little tricky to do on demand (i.e. when the topics are added to the objective)
 *
 * So instead, we depuplicating once after the objectives have been reduced, and accounting for
 * the differing formats then
 */
export function reduceTopicsOfDifferingType(topics) {
  const newTopics = uniq(
    (topics || null)
      .filter((topic) => topic !== null && topic !== undefined)
      .map((topic) => {
        if (typeof topic === 'string') {
          return topic.trim()
        }

        if (typeof topic === 'object' && topic.name) {
          return topic.name.trim()
        }

        return topic
      })
  )

  newTopics.sort((a, b) => {
    if (typeof a === 'string' && typeof b === 'string') {
      return a.localeCompare(b)
    }
    if (typeof a === 'string') return -1
    if (typeof b === 'string') return 1
    return 0
  })

  return newTopics
}

export function combineObjectiveIds(existing, objective) {
  let ids = [...(existing.ids || [])]

  if (objective.ids && Array.isArray(objective.ids)) {
    ids = [...ids, ...objective.ids]
  }

  if (objective.id) {
    ids.push(objective.id)
  }

  return [...new Set(ids)]
}

/**
 *
 * @param {Object} currentModel
 * Current goal model we are working on
 * @param {Object} goal
 * a goal, either an pre built one or one we are building on the fly as we reduce goals
 * @param {String[]} grantNumbers
 * passed into here to avoid having to refigure anything else, they come from the goal
 * @returns {Object[]} sorted objectives
 */
export function reduceObjectivesForRecipientRecord(currentModel, goal, grantNumbers) {
  // we need to reduce out the objectives, topics, and reasons
  // 1) we need to return the objectives
  // 2) we need to attach the topics and reasons to the goal
  const { objectives, topics, reasons } = [...(currentModel.objectives || []), ...(goal.objectives || [])].reduce(
    (acc, objective) => {
      // we grab the support types from the activity report objectives,
      // filtering out empty strings

      // this secondary reduction is to extract what we need from the activity reports
      // ( topic, reason, latest endDate)
      const { reportTopics, reportReasons, endDate } = (objective.activityReports || []).reduce(
        (accumulated, currentReport) => {
          // Always collect topics and reasons regardless of endDate
          const updatedTopics = [...accumulated.reportTopics, ...(currentReport.topics || [])]
          const updatedReasons = [...accumulated.reportReasons, ...(currentReport.reason || [])]

          // Skip reports without endDate for date comparison only
          if (!currentReport.endDate) {
            return {
              reportTopics: updatedTopics,
              reportReasons: updatedReasons,
              endDate: accumulated.endDate,
            }
          }

          // If accumulated.endDate is null or the current report's endDate is later
          // eslint-disable-next-line max-len
          if (!accumulated.endDate || new Date(currentReport.endDate) > new Date(accumulated.endDate)) {
            return {
              reportTopics: updatedTopics,
              reportReasons: updatedReasons,
              endDate: currentReport.endDate,
            }
          }

          return {
            reportTopics: updatedTopics,
            reportReasons: updatedReasons,
            endDate: accumulated.endDate,
          }
        },
        { reportTopics: [], reportReasons: [], endDate: objective.endDate || null }
      )

      const objectiveTitle = (objective.title || '').trim()
      const objectiveStatus = objective.status

      // get our objective topics
      const objectiveTopics = objective.activityReportObjectives?.flatMap((aro) => aro.topics) || []

      // get our citations.
      const objectiveCitations = objective.activityReportObjectives?.flatMap((aro) => aro.activityReportObjectiveCitations) || []
      const reportObjectiveCitations = objectiveCitations.map(
        (c) =>
          `${c.dataValues.monitoringReferences[0].findingType} - ${c.dataValues.citation} - ${c.dataValues.monitoringReferences[0].findingSource}`
      )

      const existing = acc.objectives.find((o) => o.title === objectiveTitle && o.status === objectiveStatus)

      if (existing) {
        const existingReports = existing.activityReports || []
        const objectiveReports = objective.activityReports || []

        existing.activityReports = uniqBy([...existingReports, ...objectiveReports], 'displayId')
        existing.reasons = uniq([...existing.reasons, ...reportReasons])
        existing.reasons.sort()
        existing.topics = [...existing.topics, ...reportTopics, ...objectiveTopics]
        existing.topics.sort()
        existing.citations = uniq([...existing.citations, ...reportObjectiveCitations])
        existing.grantNumbers = grantNumbers
        existing.ids = combineObjectiveIds(existing, objective)

        // Update onApprovedAR if current objective has it set to true
        if (objective.onApprovedAR) {
          existing.onApprovedAR = true
        }
        return { ...acc, topics: [...acc.topics, ...objectiveTopics] }
      }

      // Look up grant number by index.
      let grantNumberToUse = currentModel?.grant?.number || 'Unknown'
      const ids = Array.isArray(goal.ids) ? goal.ids : []
      const indexOfGoal = ids.indexOf(objective.goalId)
      if (indexOfGoal !== -1 && goal.grantNumbers[indexOfGoal]) {
        grantNumberToUse = goal.grantNumbers[indexOfGoal]
      }

      const formattedObjective = {
        id: objective.id,
        title: (objective.title || '').trim(),
        endDate: endDate || objective.endDate || null,
        status: objectiveStatus,
        grantNumbers: [grantNumberToUse],
        reasons: uniq(reportReasons),
        activityReports: objective.activityReports || [],
        topics: [...reportTopics, ...objectiveTopics],
        citations: uniq(reportObjectiveCitations),
        ids: combineObjectiveIds({ ids: [] }, objective),
        onApprovedAR: objective.onApprovedAR || false,
      }

      formattedObjective.topics.sort()
      formattedObjective.reasons.sort()

      return {
        objectives: [...acc.objectives, formattedObjective],
        reasons: [...acc.reasons, ...reportReasons],
        topics: reduceTopicsOfDifferingType([...acc.topics, ...reportTopics, ...objectiveTopics]),
        citations: uniq([...acc.citations, ...reportObjectiveCitations]),
      }
    },
    {
      objectives: [],
      topics: [],
      reasons: [],
      citations: [],
    }
  )

  const current = goal
  const goalTopics = Array.isArray(goal.goalTopics) ? goal.goalTopics : []
  const safeTopics = ensureArray(topics)
  const goalReasons = Array.isArray(goal.reasons) ? goal.reasons : []
  const safeReasons = ensureArray(reasons)

  current.goalTopics = reduceTopicsOfDifferingType([...goalTopics, ...safeTopics])
  current.goalTopics.sort()

  current.reasons = uniq([...goalReasons, ...safeReasons])
  current.reasons.sort()

  return [...objectives]
    .map((obj) => {
      // eslint-disable-next-line no-param-reassign
      obj.topics = reduceTopicsOfDifferingType(obj.topics)
      return obj
    })
    .sort((a, b) => {
      // Handle null/undefined dates
      if (!a.endDate && !b.endDate) {
        // If both dates are null/undefined, sort by id in descending order
        return a.id > b.id ? -1 : 1
      }
      if (!a.endDate) return 1 // Null dates go last
      if (!b.endDate) return -1

      // If dates are equal, sort by id in descending order (consistent with date sort)
      if (a.endDate === b.endDate) {
        return a.id > b.id ? -1 : 1
      }

      // Sort by date in descending order
      return new Date(a.endDate) > new Date(b.endDate) ? -1 : 1
    })
}

export function wasGoalPreviouslyClosed(goal) {
  if (goal.statusChanges) {
    return goal.statusChanges.some((statusChange) => statusChange.oldStatus === GOAL_STATUS.CLOSED)
  }

  return false
}

export function calculatePreviousStatus(goal) {
  if (goal.statusChanges && goal.statusChanges.length > 0) {
    // statusChanges is an array of { oldStatus, newStatus }.
    const lastStatusChange = goal.statusChanges[goal.statusChanges.length - 1]
    if (lastStatusChange) {
      return lastStatusChange.oldStatus
    }
  }

  // otherwise we check to see if there is the goal is on an activity report,
  // and also check the status
  if (goal.objectives.length) {
    const onAr = goal.objectives.some((objective) => objective.onApprovedAR)
    const isCompletedOrInProgress = goal.objectives.some((objective) => objective.status === 'In Progress' || objective.status === 'Complete')

    if (onAr && isCompletedOrInProgress) {
      return 'In Progress'
    }

    if (onAr && !isCompletedOrInProgress) {
      return 'Not Started'
    }
  }

  return null
}

export async function getGoalsByActivityRecipient(
  recipientId,
  regionId,
  { sortBy = 'goalStatus', sortDir = 'desc', offset = 0, limit = GOALS_PER_PAGE, goalIds = [], ...filters }
) {
  // Get the GoalTemplateFieldPrompts where title is 'FEI root cause'.
  const feiCacheKey = 'feiRootCauseFieldPrompt'
  const feiResponse = await getCachedResponse(
    feiCacheKey,
    async () => {
      const feiRootCauseFieldPrompt = await GoalTemplateFieldPrompt.findOne({
        attributes: ['goalTemplateId'],
        where: {
          title: 'FEI root cause',
        },
      })
      return JSON.stringify({
        feiRootCauseFieldPrompt,
      })
    },
    JSON.parse
  )

  // Scopes.
  const { goal: scopes } = await filtersToScopes(filters, { goal: { recipientId } })

  // Paging.
  const limitNum = parseInt(limit, 10)
  const offSetNum = parseInt(offset, 10)

  // Goal where.
  let goalWhere = {
    [Op.or]: [
      { onApprovedAR: true },
      { isFromSmartsheetTtaPlan: true },
      { createdVia: ['rtr', 'admin'] },
      { '$"goalTemplate"."creationMethod"$': CREATION_METHOD.CURATED },
    ],
    [Op.and]: scopes,
  }

  // If we have specified goals only retrieve those else all for recipient.
  if (goalIds?.length) {
    goalWhere = {
      id: goalIds,
      ...goalWhere,
    }
  }

  // goal IDS can be a string or an array of strings
  // or undefined
  // we also want at least one value here
  // so SQL doesn't have one of it's little meltdowns
  const sanitizedIds = [
    0,
    ...(() => {
      if (Array.isArray(goalIds)) {
        return goalIds
      }

      return [goalIds]
    })(),
  ]
    .map((id) => parseInt(id, DECIMAL_BASE))
    .filter((id) => !Number.isNaN(id))
    .join(',')

  // Get Goals.
  const rows = await Goal.findAll({
    attributes: [
      'id',
      'name',
      'status',
      'createdAt',
      'createdVia',
      'goalNumber',
      'onApprovedAR',
      'onAR',
      'isRttapa',
      'source',
      'goalTemplateId',
      [
        sequelize.literal(`
        CASE
          WHEN COALESCE("Goal"."status",'')  = '' OR "Goal"."status" = 'Needs Status' THEN 1
          WHEN "Goal"."status" = 'Draft' THEN 2
          WHEN "Goal"."status" = 'Not Started' THEN 3
          WHEN "Goal"."status" = 'In Progress' THEN 4
          WHEN "Goal"."status" = 'Closed' THEN 5
          WHEN "Goal"."status" = 'Suspended' THEN 6
          ELSE 7 END`),
        'status_sort',
      ],
      [sequelize.literal(`COALESCE("Goal"."goalTemplateId", 0) = ${feiResponse.feiRootCauseFieldPrompt.goalTemplateId}`), 'isFei'],
    ],
    where: goalWhere,
    include: [
      {
        model: GoalStatusChange,
        as: 'statusChanges',
        attributes: ['oldStatus'],
        required: false,
      },
      {
        model: GoalCollaborator,
        as: 'goalCollaborators',
        attributes: ['id'],
        required: false,
        include: [
          {
            model: CollaboratorType,
            as: 'collaboratorType',
            where: {
              name: 'Creator',
            },
            attributes: ['name'],
          },
          {
            model: User,
            as: 'user',
            attributes: ['name'],
            required: true,
            include: [
              {
                model: UserRole,
                as: 'userRoles',
                include: [
                  {
                    model: Role,
                    as: 'role',
                    attributes: ['name'],
                  },
                ],
                attributes: ['id'],
              },
            ],
          },
        ],
      },
      {
        model: GoalFieldResponse,
        as: 'responses',
        required: false,
        attributes: ['response', 'goalId'],
      },
      {
        model: GoalTemplate,
        as: 'goalTemplate',
        attributes: ['creationMethod', 'id'],
        required: false,
      },
      {
        model: Grant,
        as: 'grant',
        attributes: ['id', 'recipientId', 'regionId', 'number'],
        where: {
          regionId,
          recipientId,
        },
      },
      {
        attributes: ['id', 'title', 'status', 'goalId', 'onApprovedAR'],
        model: Objective,
        as: 'objectives',
        required: false,
        include: [
          {
            model: ActivityReportObjective,
            as: 'activityReportObjectives',
            attributes: ['id', 'objectiveId'],
            include: [
              {
                model: Topic,
                as: 'topics',
                attributes: ['name'],
              },
              {
                model: ActivityReportObjectiveCitation,
                as: 'activityReportObjectiveCitations',
                attributes: ['citation', 'monitoringReferences'],
              },
            ],
          },
          {
            attributes: ['id', 'reason', 'topics', 'endDate', 'calculatedStatus', 'legacyId', 'regionId', 'displayId'],
            model: ActivityReport,
            as: 'activityReports',
            required: false,
            where: {
              calculatedStatus: REPORT_STATUSES.APPROVED,
            },
          },
        ],
      },
    ],
    order: orderGoalsBy(sortBy, sortDir, goalIds),
  })

  let sorted = rows

  if (sortBy === 'goalStatus') {
    // order determined by the statuses in the GOAL_STATUS constant
    const ascOrder = Object.values(GOAL_STATUS).map((s) => s.toLowerCase())
    const descOrder = Array.from(ascOrder).reverse()

    sorted = rows.sort((a, b) => {
      // if for some reason status is falsy, we sort last
      if (!a.status || !b.status) return 1

      const aStatus = a.status.toLowerCase()
      const bStatus = b.status.toLowerCase()
      // if we found some weird status that for some reason isn't in ascOrder, sort it last
      if (!ascOrder.includes(aStatus) || !ascOrder.includes(bStatus)) return 1

      return sortDir.toLowerCase() === 'asc'
        ? ascOrder.indexOf(aStatus) - ascOrder.indexOf(bStatus)
        : descOrder.indexOf(aStatus) - descOrder.indexOf(bStatus)
    })
  }

  const allGoalIds = []

  function getGoalCollaboratorDetails(collabType, dataValues) {
    // eslint-disable-next-line max-len
    const collaborator = dataValues.goalCollaborators?.find((gc) => gc.collaboratorType.name === collabType)
    return {
      [`goal${collabType}`]: collaborator,
      [`goal${collabType}Name`]: collaborator?.user?.name,
      [`goal${collabType}Roles`]: collaborator?.user?.userRoles?.map((ur) => ur.role.name).join(', '),
    }
  }

  function createCollaborators(goal) {
    return [
      {
        goalNumber: goal.goalNumber,
        ...getGoalCollaboratorDetails('Creator', goal),
        ...getGoalCollaboratorDetails('Linker', goal),
      },
    ]
  }

  // map the goals to the format we need
  const r = sorted.map((current) => {
    allGoalIds.push(current.id)

    if (current.goalCollaborators.length > 0) {
      // eslint-disable-next-line no-param-reassign
      current.collaborators = createCollaborators(current)
    }

    const isCurated = current.goalTemplate && current.goalTemplate.creationMethod === CREATION_METHOD.CURATED

    const goalToAdd = {
      id: current.id,
      ids: [current.id],
      goalStatus: current.status,
      createdOn: current.createdAt,
      goalText: current.name.trim(),
      goalNumbers: [current.goalNumber],
      objectiveCount: 0,
      goalTopics: [],
      reasons: [],
      source: current.source,
      previousStatus: calculatePreviousStatus(current),
      isReopenedGoal: wasGoalPreviouslyClosed(current),
      objectives: [],
      grantNumbers: [current.grant.number],
      isRttapa: current.isRttapa,
      responsesForComparison: responsesForComparison(current),
      isCurated,
      createdVia: current.createdVia,
      collaborators: [],
      onAR: current.onAR,
      responses: current.responses,
      isFei: current.dataValues.isFei,
    }

    goalToAdd.collaborators.push(...createCollaborators(current))

    goalToAdd.objectives = reduceObjectivesForRecipientRecord(current, goalToAdd, [current.grant.number])

    goalToAdd.objectiveCount = goalToAdd.objectives.length

    return goalToAdd
  })

  const statuses = await goalStatusByGoalName({
    goal: {
      id: allGoalIds,
    },
  })

  // For checkbox selection we only need the primary goal id.
  const rolledUpGoalIds = r.map((goal) => {
    const bucket = {
      id: goal.id,
      goalIds: goal.ids,
    }
    return bucket
  })

  if (limitNum) {
    return {
      count: r.length,
      goalRows: r.slice(offSetNum, offSetNum + limitNum),
      statuses,
      allGoalIds: rolledUpGoalIds,
    }
  }

  return {
    count: r.length,
    goalRows: r.slice(offSetNum),
    statuses,
    allGoalIds: rolledUpGoalIds,
  }
}

export async function recipientLeadership(recipientId, regionId) {
  return ProgramPersonnel.findAll({
    attributes: [
      'grantId',
      'firstName',
      'lastName',
      'email',
      'effectiveDate',
      'role',
      // our virtual columns, which is why we fetch so much cruft above
      'fullName',
      'fullRole',
      'nameAndRole',
    ],
    where: {
      active: true,
      role: ['director', 'cfo'],
    },
    include: [
      {
        required: true,
        model: Grant,
        as: 'grant',
        attributes: ['recipientId', 'id', 'regionId'],
        where: {
          recipientId,
          regionId,
          status: 'Active',
        },
      },
      {
        required: true,
        model: Program,
        as: 'program',
      },
    ],
  })
}
