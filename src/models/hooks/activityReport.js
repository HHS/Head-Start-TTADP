const { Op } = require('sequelize');
const { REPORT_STATUSES, OBJECTIVE_STATUS } = require('../../constants');
const { auditLogger } = require('../../logger');
const { findOrCreateGoalTemplate } = require('./goal');
const { findOrCreateObjectiveTemplate } = require('./objective');

/**
 * Helper function called by model hooks.
 * Updates current model instance's calculatedStatus field.
 * Background: calculatedStatus is updated to 'submitted', 'needs_review', and 'approved'
 * based on hooks on the ActivityReportApprovers. Before submission though,
 * we want calculatedStatus to function like submissionStatus so developers
 * only have to check calculatedStatus to determine overall report status.
 * @param {*} report - current model instance
 */
const copyStatus = (instance) => {
  const { submissionStatus } = instance;
  if (submissionStatus === REPORT_STATUSES.DRAFT
    || submissionStatus === REPORT_STATUSES.DELETED) {
    instance.set('calculatedStatus', submissionStatus);
  }
};

const moveDraftGoalsToNotStartedOnSubmission = async (sequelize, instance, options) => {
  const changed = instance.changed();
  if (Array.isArray(changed)
    && changed.includes('submissionStatus')
    && instance.submissionStatus === REPORT_STATUSES.SUBMITTED) {
    try {
      const goals = await sequelize.models.Goal.findAll({
        where: {
          status: 'Draft',
        },
        include: [
          {
            attributes: [],
            through: { attributes: [] },
            model: sequelize.models.ActivityReport,
            as: 'activityReports',
            required: true,
            where: {
              id: instance.id,
            },
          },
        ],
        includeIgnoreAttributes: false,
        transaction: options.transaction,
      });

      const goalIds = goals.map((goal) => goal.id);
      await sequelize.models.Goal.update(
        { status: 'Not Started' },
        {
          where: {
            id: {
              [Op.in]: goalIds,
            },
          },
          transaction: options.transaction,
        },
      );
    } catch (error) {
      auditLogger.error(JSON.stringify({ error }));
    }
  }
};

const propogateSubmissionStatus = async (sequelize, instance, options) => {
  const changed = instance.changed();
  if (Array.isArray(changed)
    && changed.includes('submissionStatus')
    && instance.submissionStatus === REPORT_STATUSES.SUBMITTED) {
    let goals;
    try {
      goals = await sequelize.models.Goal.findAll({
        where: { goalTemplateId: null },
        include: [
          {
            attributes: [],
            through: { attributes: [] },
            model: sequelize.models.ActivityReport,
            as: 'activityReports',
            required: false,
            where: {
              id: instance.id,
            },
          },
        ],
        includeIgnoreAttributes: false,
        transaction: options.transaction,
      });
      const templateIds = await Promise.all(goals.map(async (goal) => findOrCreateGoalTemplate(
        sequelize,
        options.transaction,
        instance.regionId,
        goal.name,
        goal.createdAt,
        goal.updatedAt,
      )));
      await Promise.all(goals.map(async (goal, i) => sequelize.models.Goal.update(
        { goalTemplateId: templateIds[i] },
        {
          where: { id: goal.id },
          transaction: options.transaction,
        },
      )));
    } catch (e) {
      auditLogger.error(JSON.stringify({ e }));
      throw e;
    }

    let objectives;
    try {
      objectives = await sequelize.models.Objective.findAll({
        where: { objectiveTemplateId: null },
        include: [
          {
            attributes: [],
            through: { attributes: [] },
            model: sequelize.models.ActivityReport,
            as: 'activityReports',
            required: false,
            where: {
              id: instance.id,
            },
          },
        ],
        includeIgnoreAttributes: false,
        transaction: options.transaction,
      });
      const templateIds = await Promise.all(objectives.map(async (
        objective,
      ) => findOrCreateObjectiveTemplate(
        sequelize,
        options.transaction,
        instance.regionId,
        objective.title,
        objective.createdAt,
        objective.updatedAt,
      )));
      await Promise.all(objectives.map(async (
        objective,
        i,
      ) => sequelize.models.Objective.update(
        { objectiveTemplateId: templateIds[i] },
        {
          where: { id: objective.id },
          transaction: options.transaction,
        },
      )));
    } catch (e) {
      auditLogger.error(JSON.stringify({ e }));
      throw e;
    }
  }
};

const determineObjectiveStatus = async (activityReportId, sequelize, isResetToDraft) => {
  // Get all AR Objective Id's.
  const objectives = await sequelize.models.ActivityReportObjective.findAll(
    {
      attributes: [
        'id',
        'objectiveId',
      ],
      where: { activityReportId },
    },
  );
  const objectiveIds = objectives.map((o) => o.objectiveId);

  // Get all the reports that use the objectives
  const allObjectiveReports = await sequelize.models.ActivityReport.findAll({
    attributes: ['id', 'calculatedStatus', 'endDate'],
    include: [
      {
        model: sequelize.models.ActivityReportObjective,
        as: 'activityReportObjectives',
        attributes: ['id', 'objectiveId', 'status'],
        where: {
          objectiveId: objectiveIds,
        },
        required: true,
        include: [{
          model: sequelize.models.Objective,
          as: 'objective',
          attributes: ['id', 'status'],
          required: true,
        }],
      },
    ],
  });

  // Get Approved Reports that might set the status.
  const approvedReports = allObjectiveReports.filter(
    (a) => a.calculatedStatus === REPORT_STATUSES.APPROVED,
  );

  // Only change the status if we have an approved report using the objective.
  if (approvedReports.length) {
    Promise.all(objectiveIds.map((o) => {
      // Get reports that use this objective.
      const relevantARs = approvedReports.filter(
        (a) => a.activityReportObjectives.find((aro) => aro.objectiveId === o),
      );
        // Get latest report by end date.
      const latestAR = relevantARs.reduce((r, a) => (r.endDate > a.endDate ? r : a));

      // Get Objective to take status from.
      const aro = latestAR.activityReportObjectives.find(((a) => a.objectiveId === o));

      // Update Objective status.
      return sequelize.models.Objective.update({
        status: aro.status || 'Not Started',
      }, {
        where: { id: o },
        individualHooks: true,
      });
    }));
  } else if (isResetToDraft) {
    // If there are no Approved reports set Objective status back to 'Not Started'.
    const currentReport = allObjectiveReports.find((r) => r.id === activityReportId);
    const objectiveIdsToReset = currentReport.activityReportObjectives.map((a) => a.objectiveId);
    await sequelize.models.Objective.update({
      status: OBJECTIVE_STATUS.NOT_STARTED,
    }, {
      where: { id: objectiveIdsToReset },
      individualHooks: true,
    });
  }
};
const propagateApprovedStatus = async (sequelize, instance, options) => {
  const changed = instance.changed();
  if (Array.isArray(changed) && changed.includes('calculatedStatus')) {
    if (instance.previous('calculatedStatus') === REPORT_STATUSES.APPROVED
      && instance.calculatedStatus !== REPORT_STATUSES.APPROVED) {
      // eslint-disable-next-line max-len
      // TODO: Run extensive check and update where required all used goals and objectives as not onApprovedAR
      let objectives;
      try {
        objectives = await sequelize.models.Objective.findAll({
          attributes: [
            'id',
            [sequelize.literal('count(DISTINCT "activityReports"."calculatedStatus")'), 'cntApproved'],
          ],
          include: [
            {
              attributes: [],
              model: sequelize.models.ActivityReportObjective,
              as: 'activityReportObjectives',
              required: true,
              where: {
                activityReportId: instance.id,
              },
            },
            {
              attributes: [],
              through: { attributes: [] },
              model: sequelize.models.ActivityReport,
              as: 'activityReports',
              required: false,
              where: {
                id: { [Op.not]: instance.id },
                calculatedStatus: REPORT_STATUSES.APPROVED,
              },
            },
          ],
          includeIgnoreAttributes: false,
          group: sequelize.literal('"Objective"."id"'),
          having: sequelize.literal('count(DISTINCT "activityReports"."calculatedStatus") = 0'),
        });
      } catch (e) {
        auditLogger.error(JSON.stringify({
          location: __filename, type: 'objectives', e, objectives,
        }));
        throw e;
      }

      if (objectives && objectives.length > 0) {
        await sequelize.models.Objective.update(
          { onApprovedAR: false },
          {
            where: {
              id: { [Op.in]: objectives.map((o) => o.id) },
              onApprovedAR: true,
            },
            transaction: options.transaction,
            individualHooks: true,
          },
        );
      }

      /*  Determine Objective Statuses (Approved > Other) */
      await determineObjectiveStatus(instance.id, sequelize, true);

      let goals;
      try {
        goals = await sequelize.models.Goal.findAll({
          attributes: [
            'id',
            [sequelize.literal('count(DISTINCT "activityReports"."calculatedStatus")'), 'cntApproved'],
          ],
          include: [
            {
              attributes: [],
              model: sequelize.models.Objective,
              as: 'objectives',
              required: true,
              include: [
                {
                  attributes: [],
                  model: sequelize.models.ActivityReportObjective,
                  as: 'activityReportObjectives',
                  required: true,
                  where: {
                    activityReportId: instance.id,
                  },
                },
              ],
            },
            {
              attributes: [],
              through: { attributes: [] },
              model: sequelize.models.ActivityReport,
              as: 'activityReports',
              required: false,
              where: {
                id: { [Op.not]: instance.id },
                calculatedStatus: REPORT_STATUSES.APPROVED,
              },
            },
          ],
          includeIgnoreAttributes: false,
          group: sequelize.literal('"Goal"."id"'),
          having: sequelize.literal('count(DISTINCT "activityReports"."calculatedStatus") = 0'),
          transaction: options.transaction,
        });
      } catch (e) {
        auditLogger.error(JSON.stringify({
          location: __filename, type: 'goals', e, goals,
        }));
        throw e;
      }

      if (goals && goals.length > 0) {
        await sequelize.models.Goal.update(
          { onApprovedAR: false },
          {
            where: {
              id: { [Op.in]: goals.map((g) => g.id) },
              onApprovedAR: true,
            },
            transaction: options.transaction,
            individualHooks: true,
          },
        );
      }
    } else if (instance.previous('calculatedStatus') !== REPORT_STATUSES.APPROVED
    && instance.calculatedStatus === REPORT_STATUSES.APPROVED) {
      const objectivesAndGoals = await sequelize.models.Objective.findAll(
        {
          attributes: [
            'id',
            'goalId',
          ],
          include: [
            {
              attributes: [],
              model: sequelize.models.ActivityReportObjective,
              as: 'activityReportObjectives',
              required: true,
              where: { activityReportId: instance.id },
            },
          ],
          includeIgnoreAttributes: false,
          transaction: options.transaction,
        },
      );
      const objectiveIds = objectivesAndGoals.map((o) => o.id);
      await sequelize.models.Objective.update(
        { onApprovedAR: true },
        {
          where: {
            id: objectiveIds,
            onApprovedAR: false,
          },
          transaction: options.transaction,
          individualHooks: true,
        },
      );

      /*  Determine Objective Statuses (Other > Approved) */
      await determineObjectiveStatus(instance.id, sequelize, false);

      await sequelize.models.Goal.update(
        { onApprovedAR: true },
        {
          where: {
            id: objectivesAndGoals.map((o) => o.goalId),
            onApprovedAR: false,
          },
          transaction: options.transaction,
          individualHooks: true,
        },
      );
    }
  }
};

const automaticStatusChangeOnApprovalForGoals = async (sequelize, instance, options) => {
  const changed = instance.changed();
  if (Array.isArray(changed)
    && changed.includes('calculatedStatus')
    && instance.previous('calculatedStatus') !== REPORT_STATUSES.APPROVED
    && instance.calculatedStatus === REPORT_STATUSES.APPROVED) {
    // when a report is approved, the status of all the goals on that report should be recalculated
    // with the exceptions that 1) goals are not automatically closed
    // and 2) goals that are "In Progress" are not moved backward
    // so we start with finding all the goals that *could* be changed
    // (goals in draft or not started)
    const goals = await sequelize.models.Goal.findAll(
      {
        where: {
          status: ['Draft', 'Not Started'],
        },
        include: [
          {
            model: sequelize.models.Objective,
            as: 'objectives',
          },
          {
            model: sequelize.models.ActivityReport,
            as: 'activityReports',
            required: true,
            where: { id: instance.id },
          },
        ],
        transaction: options.transaction,
      },
    );

    await Promise.all((goals.map((goal) => {
      const status = 'In Progress';

      // if the goal should be in a different state, we will update it
      if (goal.status !== status) {
        goal.set('previousStatus', goal.status);
        goal.set('status', status);
      }
      return goal.save({ transaction: options.transaction, individualHooks: true });
    })));
  }
};

const automaticGoalObjectiveStatusCachingOnApproval = async (sequelize, instance, options) => {
  const changed = instance.changed();
  if (Array.isArray(changed)
    && changed.includes('calculatedStatus')
    && instance.previous('calculatedStatus') !== REPORT_STATUSES.APPROVED
    && instance.calculatedStatus === REPORT_STATUSES.APPROVED) {
    const goals = await sequelize.models.Goal.findAll({
      include: [{
        model: sequelize.models.ActivityReport,
        as: 'activityReports',
        required: true,
        where: { id: instance.id },
      }],
      transaction: options.transaction,
    });

    // Update Goal status to 'In Progress'.
    await Promise.all(goals
      .map(async (goal) => sequelize.models.ActivityReportGoal.update(
        { status: goal.status },
        {
          where: {
            activityReportId: instance.id,
          },
          transaction: options.transaction,
          individualHooks: true,
        },
      )));
  }
};

const beforeCreate = async (instance) => {
  copyStatus(instance);
};

const beforeUpdate = async (instance) => {
  copyStatus(instance);
};
const afterUpdate = async (sequelize, instance, options) => {
  await propogateSubmissionStatus(sequelize, instance, options);
  await propagateApprovedStatus(sequelize, instance, options);
  await automaticStatusChangeOnApprovalForGoals(sequelize, instance, options);
  await automaticGoalObjectiveStatusCachingOnApproval(sequelize, instance, options);
  await moveDraftGoalsToNotStartedOnSubmission(sequelize, instance, options);
};

export {
  copyStatus,
  propagateApprovedStatus,
  automaticStatusChangeOnApprovalForGoals,
  beforeCreate,
  beforeUpdate,
  afterUpdate,
  moveDraftGoalsToNotStartedOnSubmission,
};
