import { Op } from 'sequelize';
import { REPORT_STATUSES, DECIMAL_BASE } from '@ttahub/common';
import { uniq, uniqBy } from 'lodash';
import {
  Grant,
  Recipient,
  Program,
  sequelize,
  Goal,
  GoalFieldResponse,
  GoalTemplate,
  ActivityReport,
  EventReportPilot,
  SessionReportPilot,
  Objective,
  ActivityRecipient,
  Topic,
  Permission,
  ProgramPersonnel,
  User,
  ActivityReportCollaborator,
  ActivityReportApprover,
} from '../models';
import orderRecipientsBy from '../lib/orderRecipientsBy';
import {
  RECIPIENTS_PER_PAGE,
  GOALS_PER_PAGE,
  GOAL_STATUS,
  CREATION_METHOD,
} from '../constants';
import filtersToScopes from '../scopes';
import orderGoalsBy from '../lib/orderGoalsBy';
import goalStatusByGoalName from '../widgets/goalStatusByGoalName';
import {
  findOrFailExistingGoal,
  responsesForComparison,
} from '../goalServices/helpers';

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
  });

  return uniq([
    ...reports.map((r) => r.userId),
    ...reports.map((r) => r.activityReportCollaborators.map((c) => c.userId)).flat(),
    ...reports.map((r) => r.approvers.map((a) => a.userId)).flat(),
  ]);
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
  });

  if (!user) {
    return [];
  }

  const regions = user.permissions.map((p) => p.regionId);

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
  });
}

export async function allRecipients() {
  return Recipient.findAll({
    include: [
      {
        attributes: ['id', 'number', 'regionId'],
        model: Grant,
        as: 'grants',
        where: {
          [Op.and]: [
            { deleted: { [Op.ne]: true } },
            {
              endDate: {
                [Op.gt]: '2020-08-31',
              },
            },
            {
              [Op.or]: [{ inactivationDate: null }, { inactivationDate: { [Op.gt]: '2020-08-31' } }],
            },
          ],
        },
      },
    ],
  });
}

export async function recipientById(recipientId, grantScopes) {
  return Recipient.findOne({
    attributes: ['id', 'name', 'recipientType', 'uei'],
    where: {
      id: recipientId,
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
        where: [{
          [Op.and]: [
            { [Op.and]: grantScopes },
            { deleted: { [Op.ne]: true } },
            {
              [Op.or]: [
                {
                  status: 'Active',
                },
                {
                  [Op.and]: [
                    {
                      endDate: {
                        [Op.gt]: '2020-08-31',
                      },
                    },
                    {
                      [Op.or]: [{ inactivationDate: null }, { inactivationDate: { [Op.gt]: '2020-08-31' } }],
                    },
                  ],
                },
              ],
            },
          ],
        }],
        include: [
          {
            attributes: ['name', 'programType'],
            model: Program,
            as: 'programs',
          },
        ],
      },
    ],
    order: [
      [{ model: Grant, as: 'grants' }, 'status', 'ASC'], [{ model: Grant, as: 'grants' }, 'endDate', 'DESC'], [{ model: Grant, as: 'grants' }, 'number', 'ASC'],
    ],
  });
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
  const q = `%${query}%`;
  const limit = RECIPIENTS_PER_PAGE;

  const rows = await Recipient.findAll({
    attributes: [
      [sequelize.literal('DISTINCT COUNT(*) OVER()'), 'count'],
      sequelize.literal('STRING_AGG(DISTINCT "grants"."programSpecialistName", \', \' order by "grants"."programSpecialistName") as "programSpecialists"'),
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
          [Op.and]: [
            { '$grants.number$': { [Op.iLike]: q } },
          ],
        },
      ],
    },
    include: [{
      attributes: [],
      model: Grant.unscoped(),
      as: 'grants',
      required: true,
      where: [{
        [Op.and]: [
          { deleted: { [Op.ne]: true } },
          {
            [Op.and]: { regionId: userRegions },
          },
          { [Op.and]: scopes },
          {
            [Op.or]: [
              {
                status: 'Active',
              },
              {
                [Op.and]: [
                  {
                    endDate: {
                      [Op.gt]: '2020-08-31',
                    },
                  },
                  {
                    [Op.or]: [{ inactivationDate: null }, { inactivationDate: { [Op.gt]: '2020-08-31' } }],
                  },
                ],
              },
            ],
          },
        ],
      }],
    }],
    subQuery: false,
    raw: true,
    group: [
      'grants.regionId',
      'Recipient.id',
    ],
    limit,
    offset,
    order: orderRecipientsBy(sortBy, direction),
  });

  // handle zero results
  const firstRow = rows[0];
  const count = firstRow ? firstRow.count : 0;

  return {
    count: parseInt(count, 10),
    rows,
  };
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
function reduceTopicsOfDifferingType(topics) {
  const newTopics = uniq(topics.map((topic) => {
    if (typeof topic === 'string') {
      return topic;
    }

    if (topic.name) {
      return topic.name;
    }

    return topic;
  }));

  newTopics.sort();

  return newTopics;
}

/**
 *
 * @param {Object} currentModel
 * Current goal model we are working on
 * @param {Object} goal
 * a goal, either an pre built one or one we are building on the fly as we reduce goals
 * @param {String[]} grantNumbers
 * passed into here to avoid having to refigure anything else, they come from the goal
 * @param {Object[]} sessionObjectives
 * a bespoke data collection from the goal->eventReportPilots->sessionReports
 * @returns {Object[]} sorted objectives
 */
export function reduceObjectivesForRecipientRecord(
  currentModel,
  goal,
  grantNumbers,
  sessionObjectives = [],
) {
  // we need to reduce out the objectives, topics, and reasons
  // 1) we need to return the objectives
  // 2) we need to attach the topics and reasons to the goal
  const {
    objectives,
    topics,
    reasons,
  } = [
    ...(currentModel.objectives || []),
    ...(goal.objectives || [])]
    .reduce((acc, objective) => {
      // we grab the support types from the activity report objectives,
      // filtering out empty strings
      const { supportType } = objective;

      // this secondary reduction is to extract what we need from the activity reports
      // ( topic, reason, latest endDate)
      const {
        reportTopics,
        reportReasons,
        endDate,
      } = (objective.activityReports || []).reduce((accumulated, currentReport) => ({
        reportTopics: [...accumulated.reportTopics, ...currentReport.topics],
        reportReasons: [...accumulated.reportReasons, ...currentReport.reason],
        // eslint-disable-next-line max-len
        endDate: new Date(currentReport.endDate) < new Date(accumulated.endDate) ? accumulated.endDate : currentReport.endDate,
      }), { reportTopics: [], reportReasons: [], endDate: '' });

      const objectiveTitle = objective.title.trim();
      const objectiveStatus = objective.status;

      // get our objective topics

      const objectiveTopics = (objective.topics || []);

      const existing = acc.objectives.find((o) => (
        o.title === objectiveTitle
        && o.status === objectiveStatus
        && o.supportType === supportType
      ));

      if (existing) {
        existing.activityReports = uniqBy([...existing.activityReports, ...objective.activityReports], 'displayId');
        existing.reasons = uniq([...existing.reasons, ...reportReasons]);
        existing.reasons.sort();
        existing.topics = [...existing.topics, ...reportTopics, ...objectiveTopics];
        existing.topics.sort();
        existing.grantNumbers = grantNumbers;

        return { ...acc, topics: [...acc.topics, ...objectiveTopics] };
      }

      // Look up grant number by index.
      let grantNumberToUse = currentModel.grant.number;
      const indexOfGoal = goal.ids.indexOf(objective.goalId);
      if (indexOfGoal !== -1 && goal.grantNumbers[indexOfGoal]) {
        grantNumberToUse = goal.grantNumbers[indexOfGoal];
      }

      const formattedObjective = {
        title: objective.title.trim(),
        endDate,
        status: objectiveStatus,
        grantNumbers: [grantNumberToUse],
        reasons: uniq(reportReasons),
        activityReports: objective.activityReports || [],
        topics: [...reportTopics, ...objectiveTopics],
        supportType: supportType || null,
      };

      formattedObjective.topics.sort();
      formattedObjective.reasons.sort();

      return {
        objectives: [...acc.objectives, formattedObjective],
        reasons: [...acc.reasons, ...reportReasons],
        topics: reduceTopicsOfDifferingType([...acc.topics, ...reportTopics, ...objectiveTopics]),
      };
    }, {
      objectives: [],
      topics: [],
      reasons: [],
    });

  const current = goal;
  current.goalTopics = reduceTopicsOfDifferingType([...goal.goalTopics, ...topics]);
  current.goalTopics.sort();

  current.reasons = uniq([...goal.reasons, ...reasons]);
  current.reasons.sort();

  return [...sessionObjectives, ...objectives].map((obj) => {
    // eslint-disable-next-line no-param-reassign
    obj.topics = reduceTopicsOfDifferingType(obj.topics);
    return obj;
  }).sort((a, b) => ((
    a.endDate === b.endDate ? a.id < b.id
      : new Date(a.endDate) < new Date(b.endDate)) ? 1 : -1));
}

function calculatePreviousStatus(goal) {
  // if we have a previous status recorded, return that
  if (goal.previousStatus) {
    return goal.previousStatus;
  }

  // otherwise we check to see if there is the goal is on an activity report,
  // and also check the status
  if (goal.objectives.length) {
    const onAr = goal.objectives.some((objective) => objective.activityReports.length);
    const isCompletedOrInProgress = goal.objectives.some((objective) => objective.status === 'In Progress' || objective.status === 'Complete');

    if (onAr && isCompletedOrInProgress) {
      return 'In Progress';
    }

    if (onAr && !isCompletedOrInProgress) {
      return 'Not Started';
    }
  }

  return null;
}

export async function getGoalsByActivityRecipient(
  recipientId,
  regionId,
  {
    sortBy = 'goalStatus',
    sortDir = 'desc',
    offset = 0,
    limit = GOALS_PER_PAGE,
    goalIds = [],
    ...filters
  },
) {
  // Scopes.
  const { goal: scopes } = await filtersToScopes(filters, { goal: { recipientId } });

  // Paging.
  const limitNum = parseInt(limit, 10);
  const offSetNum = parseInt(offset, 10);

  // Goal where.
  let goalWhere = {
    [Op.or]: [
      { onApprovedAR: true },
      { isFromSmartsheetTtaPlan: true },
      { createdVia: ['rtr', 'admin', 'merge'] },
      { '$"goalTemplate"."creationMethod"$': CREATION_METHOD.CURATED },
      {
        createdVia: ['tr'],
        status: {
          [Op.not]: 'Draft',
        },
      },
    ],
    [Op.and]: scopes,
  };

  // If we have specified goals only retrieve those else all for recipient.
  if (sortBy !== 'mergedGoals' && goalIds && goalIds.length) {
    goalWhere = {
      id: goalIds,
      ...goalWhere,
    };
  }

  // goal IDS can be a string or an array of strings
  // or undefined
  // we also want at least one value here
  // so SQL doesn't have one of it's little meltdowns
  const sanitizedIds = [
    0,
    ...(() => {
      if (!goalIds) {
        return [];
      }

      if (Array.isArray(goalIds)) {
        return goalIds;
      }

      return [goalIds];
    })(),
  ].map((id) => parseInt(id, DECIMAL_BASE))
    .filter((id) => !Number.isNaN(id))
    .join(',');

  // Get Goals.
  const rows = await Goal.findAll({
    attributes: [
      'id',
      'name',
      'status',
      'createdAt',
      'createdVia',
      'goalNumber',
      'previousStatus',
      'onApprovedAR',
      'onAR',
      'isRttapa',
      'source',
      'goalTemplateId',
      [sequelize.literal(`
        CASE
          WHEN COALESCE("Goal"."status",'')  = '' OR "Goal"."status" = 'Needs Status' THEN 1
          WHEN "Goal"."status" = 'Draft' THEN 2
          WHEN "Goal"."status" = 'Not Started' THEN 3
          WHEN "Goal"."status" = 'In Progress' THEN 4
          WHEN "Goal"."status" = 'Closed' THEN 5
          WHEN "Goal"."status" = 'Suspended' THEN 6
          ELSE 7 END`),
      'status_sort'],
      [sequelize.literal(`CASE WHEN "Goal"."id" IN (${sanitizedIds}) THEN 1 ELSE 2 END`), 'merged_id'],
    ],
    where: goalWhere,
    include: [
      {
        model: EventReportPilot,
        as: 'eventReportPilots',
        required: false,
        attributes: ['id'],
        include: [
          {
            model: SessionReportPilot,
            as: 'sessionReports',
            attributes: ['id', 'data'],
            required: false,
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
        attributes: [
          'id', 'recipientId', 'regionId', 'number',
        ],
        where: {
          regionId,
          recipientId,
        },
      },
      {
        attributes: [
          'id',
          'title',
          'status',
          'goalId',
          'onApprovedAR',
          'supportType',
        ],
        model: Objective,
        as: 'objectives',
        required: false,
        include: [
          {
            model: Topic,
            as: 'topics',
          },
          {
            attributes: [
              'id',
              'reason',
              'topics',
              'endDate',
              'calculatedStatus',
              'legacyId',
              'regionId',
              'displayId',
            ],
            model: ActivityReport,
            as: 'activityReports',
            required: false,
            where: {
              calculatedStatus: REPORT_STATUSES.APPROVED,
            },
            include: [
              {
                model: ActivityRecipient,
                as: 'activityRecipients',
                attributes: ['activityReportId', 'grantId'],
                required: true,
                include: [
                  {
                    required: true,
                    model: Grant,
                    as: 'grant',
                    attributes: ['id', 'recipientId'],
                    where: {
                      recipientId,
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
    order: orderGoalsBy(sortBy, sortDir, goalIds),
  });

  let sorted = rows;

  if (sortBy === 'goalStatus') {
    // order determined by the statuses in the GOAL_STATUS constant
    const ascOrder = Object.values(GOAL_STATUS).map((s) => s.toLowerCase());
    const descOrder = Array.from(ascOrder).reverse();

    sorted = rows.sort((a, b) => {
      // if for some reason status is falsy, we sort last
      if (!a.status || !b.status) return 1;

      const aStatus = a.status.toLowerCase();
      const bStatus = b.status.toLowerCase();
      // if we found some weird status that for some reason isn't in ascOrder, sort it last
      if (!ascOrder.includes(aStatus) || !ascOrder.includes(bStatus)) return 1;

      return sortDir.toLowerCase() === 'asc'
        ? ascOrder.indexOf(aStatus) - ascOrder.indexOf(bStatus)
        : descOrder.indexOf(aStatus) - descOrder.indexOf(bStatus);
    });
  }

  const allGoalIds = [];

  const r = sorted.reduce((previous, current) => {
    const existingGoal = findOrFailExistingGoal(current, previous.goalRows);

    allGoalIds.push(current.id);

    const isCurated = current.goalTemplate
      && current.goalTemplate.creationMethod === CREATION_METHOD.CURATED;

    if (existingGoal) {
      existingGoal.ids = [...existingGoal.ids, current.id];
      existingGoal.goalNumbers = [...existingGoal.goalNumbers, current.goalNumber];
      existingGoal.grantNumbers = uniq([...existingGoal.grantNumbers, current.grant.number]);
      existingGoal.objectives = reduceObjectivesForRecipientRecord(
        current,
        existingGoal,
        existingGoal.grantNumbers,
      );
      existingGoal.objectiveCount = existingGoal.objectives.length;
      existingGoal.isCurated = isCurated || existingGoal.isCurated;
      existingGoal.onAR = existingGoal.onAR || current.onAR;
      return {
        goalRows: previous.goalRows,
      };
    }

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
      objectives: [],
      grantNumbers: [current.grant.number],
      isRttapa: current.isRttapa,
      responsesForComparison: responsesForComparison(current),
      isCurated,
      createdVia: current.createdVia,
      onAR: current.onAR,
    };

    const sessionObjectives = current.eventReportPilots
      // shape the session objective, mold it into a form that
      // satisfies the frontend's needs
      .map((erp) => erp.sessionReports.map((sr) => {
        if (!sr.data.objective) {
          return null;
        }

        return {
          type: 'session',
          title: sr.data.objective,
          topics: sr.data.objectiveTopics || [],
          grantNumbers: [current.grant.number],
          endDate: sr.data.endDate,
          sessionName: sr.data.sessionName,
          trainingReportId: sr.data.eventDisplayId,
        };
      // filter out nulls, and flatten the array
      }).filter((sr) => sr)).flat();

    goalToAdd.objectives = reduceObjectivesForRecipientRecord(
      current,
      goalToAdd,
      [current.grant.number],
      sessionObjectives,
    );
    goalToAdd.objectiveCount = goalToAdd.objectives.length;

    return {
      goalRows: [...previous.goalRows, goalToAdd],
    };
  }, {
    goalRows: [],
  });

  const statuses = await goalStatusByGoalName({
    goal: {
      id: allGoalIds,
    },
  });

  if (limitNum) {
    return {
      count: r.goalRows.length,
      goalRows: r.goalRows.slice(offSetNum, offSetNum + limitNum),
      statuses,
      allGoalIds,
    };
  }

  return {
    count: r.goalRows.length,
    goalRows: r.goalRows.slice(offSetNum),
    statuses,
    allGoalIds,
  };
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
  });
}
