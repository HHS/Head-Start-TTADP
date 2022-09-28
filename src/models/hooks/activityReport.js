const { Op } = require('sequelize');
const { REPORT_STATUSES, ENTITY_TYPES, APPROVAL_RATIO } = require('../../constants');
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

const cleanUpAllCollaborators = async (
  sequelize,
  instance,
  options,
) => sequelize.models.Collaborator.destroy({
  where: { entityType: ENTITY_TYPES.REPORT, entityId: instance.id },
  individualHooks: true,
  transaction: options.transaction,
});

const cleanUpAllApprovals = async (
  sequelize,
  instance,
  options,
) => sequelize.models.Approval.destroy({
  where: { entityType: ENTITY_TYPES.REPORT, entityId: instance.id },
  individualHooks: true,
  transaction: options.transaction,
});

const cleanUpAllReportGoals = async (
  sequelize,
  instance,
  options,
) => sequelize.models.ActivityReportGoal.destroy({
  where: { activityReportId: instance.id },
  individualHooks: true,
  transaction: options.transaction,
});

const cleanUpAllReportObjectives = async (
  sequelize,
  instance,
  options,
) => sequelize.models.ActivityReportObjective.destroy({
  where: { activityReportId: instance.id },
  individualHooks: true,
  transaction: options.transaction,
});

const createApproval = async (
  sequelize,
  instance,
  options,
) => sequelize.models.Approval.create(
  {
    entityType: ENTITY_TYPES.REPORT,
    entityId: instance.id,
    tier: 0,
    ratioRequired: APPROVAL_RATIO.ALL,
    submissionStatus: REPORT_STATUSES.DRAFT,
  },
  {
    transaction: options.transaction,
  },
);

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

const propagateApprovedStatus = async (sequelize, instance, options) => {
  const changed = instance.changed();
  if (Array.isArray(changed) && changed.includes('calculatedStatus')) {
    if (instance.previous('calculatedStatus') === REPORT_STATUSES.APPROVED
      && instance.approval.calculatedStatus !== REPORT_STATUSES.APPROVED) {
      // eslint-disable-next-line max-len
      // TODO: Run extensive check and update where required all used goals and objectives as not onApprovedAR
      let objectives;
      try {
        objectives = await sequelize.models.Objective.findAll({
          attributes: [
            'id',
            [sequelize.literal('count(DISTINCT "activityReports->approval"."calculatedStatus")'), 'cntApproved'],
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
              include: [{
                model: sequelize.models.Approval,
                as: 'approval',
                required: true,
                where: { calculatedStatus: REPORT_STATUSES.APPROVED },
              }],
              where: { id: { [Op.not]: instance.id } },
            },
          ],
          includeIgnoreAttributes: false,
          group: sequelize.literal('"Objective"."id"'),
          having: sequelize.literal('count(DISTINCT "activityReports->approval"."calculatedStatus") = 0'),
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
      let goals;
      try {
        goals = await sequelize.models.Goal.findAll({
          attributes: [
            'id',
            [sequelize.literal('count(DISTINCT "activityReports->approval"."calculatedStatus")'), 'cntApproved'],
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
              include: [{
                model: sequelize.models.Approval,
                as: 'approval',
                required: true,
                where: { calculatedStatus: REPORT_STATUSES.APPROVED },
              }],
              where: { id: { [Op.not]: instance.id } },
            },
          ],
          includeIgnoreAttributes: false,
          group: sequelize.literal('"Goal"."id"'),
          having: sequelize.literal('count(DISTINCT "activityReports->approval"."calculatedStatus") = 0'),
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
    && instance.approval.calculatedStatus === REPORT_STATUSES.APPROVED) {
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
      await sequelize.models.Objective.update(
        { onApprovedAR: true },
        {
          where: {
            id: objectivesAndGoals.map((o) => o.id),
            onApprovedAR: false,
          },
          transaction: options.transaction,
          individualHooks: true,
        },
      );
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

const automaticStatusChangeOnAprovalForGoals = async (sequelize, instance, options) => {
  const changed = instance.changed();
  if (Array.isArray(changed)
    && changed.includes('calculatedStatus')
    && instance.previous('calculatedStatus') !== REPORT_STATUSES.APPROVED
    && instance.approval.calculatedStatus === REPORT_STATUSES.APPROVED) {
    const goals = await sequelize.models.Goal.findAll(
      {
        where: {
          status: ['Draft', 'Not Started'],
        },
        include: [
          {
            model: sequelize.models.Objective,
            as: 'objectives',
            where: {
              status: ['In Progress', 'Completed'],
            },
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

    // Update Goal status to 'In Progress'.
    await Promise.all(goals.map(async (goal) => {
      goal.set('status', 'In Progress');
      return goal.save();
    }));
  }
};

const automaticGoalObjectiveStatusCachingOnAproval = async (sequelize, instance, options) => {
  const changed = instance.changed();
  if (Array.isArray(changed)
    && changed.includes('calculatedStatus')
    && instance.previous('calculatedStatus') !== REPORT_STATUSES.APPROVED
    && instance.approval.calculatedStatus === REPORT_STATUSES.APPROVED) {
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

    const objectives = await sequelize.models.Objective.findAll({
      include: [{
        model: sequelize.models.ActivityReport,
        as: 'activityReports',
        required: true,
        where: { id: instance.id },
      }],
      transaction: options.transaction,
    });

    // Update Objective status to 'In Progress'.
    await Promise.all(objectives
      .map(async (objective) => sequelize.models.ActivityReportObjective.update(
        { status: objective.status },
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

const beforeDestroy = async (sequelize, instance, options) => Promise.all([
  cleanUpAllCollaborators(sequelize, instance, options),
  cleanUpAllApprovals(sequelize, instance, options),
  cleanUpAllReportGoals(sequelize, instance, options),
  cleanUpAllReportObjectives(sequelize, instance, options),
]);

const afterCreate = async (sequelize, instance, options) => {
  await createApproval(sequelize, instance, options);
};

const afterUpdate = async (sequelize, instance, options) => {
  await propogateSubmissionStatus(sequelize, instance, options);
  await propagateApprovedStatus(sequelize, instance, options);
  await automaticStatusChangeOnAprovalForGoals(sequelize, instance, options);
  await automaticGoalObjectiveStatusCachingOnAproval(sequelize, instance, options);
};

export {
  copyStatus,
  cleanUpAllCollaborators,
  cleanUpAllApprovals,
  cleanUpAllReportGoals,
  cleanUpAllReportObjectives,
  createApproval,
  propagateApprovedStatus,
  automaticStatusChangeOnAprovalForGoals,
  beforeCreate,
  beforeUpdate,
  beforeDestroy,
  afterCreate,
  afterUpdate,
};
