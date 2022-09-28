const { Op } = require('sequelize');
const { REPORT_STATUSES, ENTITY_TYPES } = require('../../constants');
const { auditLogger } = require('../../logger');
const { findOrCreateGoalTemplate } = require('./goal');
const { findOrCreateObjectiveTemplate } = require('./objective');

/**
 * Helper function called by model hooks.
 * Updates current model instance's calculatedStatus field.
 * Background: calculatedStatus is updated to 'submitted', 'needs_review', and 'approved'
 * based on hooks on the collaborator with a collaborator type of RATIFIER. Before submission
 * though, we want calculatedStatus to function like submissionStatus so developers
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

const propagateSubmissionStatusToGoalsAndObjectives = async (sequelize, instance, options) => {
  const changed = instance.changed();
  if (Array.isArray(changed)
    && changed.includes('submissionStatus')
    && instance.submissionStatus === REPORT_STATUSES.SUBMITTED
    && instance.entityType === ENTITY_TYPES.REPORT
    && instance.tier === 0) {
    let goals;
    try {
      goals = await sequelize.models.Goal.findAll({
        where: { goalTemplateId: null },
        include: [
          {
            attributes: ['regionId'],
            through: { attributes: [] },
            model: sequelize.models.ActivityReport,
            as: 'activityReports',
            required: false,
            where: {
              id: instance.entityId,
            },
          },
        ],
        includeIgnoreAttributes: false,
        transaction: options.transaction,
      });
      const templateIds = await Promise.all(goals.map(async (goal) => findOrCreateGoalTemplate(
        sequelize,
        options.transaction,
        goal.regionId,
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
            attributes: ['regionId'],
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
        objective.regionId,
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

const propagateApprovedStatusForGoalsAndObjectives = async (sequelize, instance, options) => {
  const changed = instance.changed();
  if (Array.isArray(changed)
    && changed.includes('calculatedStatus')
    && instance.entityType === ENTITY_TYPES.REPORT
    && instance.tier === 0) {
    if (instance.previous('calculatedStatus') === REPORT_STATUSES.APPROVED
      && instance.calculatedStatus !== REPORT_STATUSES.APPROVED) {
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

const automaticStatusChangeOnApprovalForGoals = async (sequelize, instance, options) => {
  const changed = instance.changed();
  if (Array.isArray(changed)
    && changed.includes('calculatedStatus')
    && instance.previous('calculatedStatus') !== REPORT_STATUSES.APPROVED
    && instance.calculatedStatus === REPORT_STATUSES.APPROVED
    && instance.entityType === ENTITY_TYPES.REPORT
    && instance.tier === 0) {
    const goals = await sequelize.models.Goal.findAll(
      {
        where: {
          status: { [Op.in]: ['Draft', 'Not Started'] },
        },
        include: [
          {
            model: sequelize.models.Objective,
            as: 'objectives',
            where: {
              status: { [Op.in]: ['In Progress', 'Completed'] },
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

const propagateApprovedCalculatedStatusAcrossTiers = async (sequelize, instance, options) => {
  const changed = instance.changed();
  if (instance.tier !== 0
    && Array.isArray(changed)
    && changed.includes('calculatedStatus')) {
    const allApprovalTiers = await sequelize.models.Approval.findAll({
      attributes: ['tier', 'calculatedStatus'],
      where: {
        entityType: instance.entityType,
        entityId: instance.entityId,
        tier: { [Op.not]: 0 },
      },
      transaction: options.transaction,
    });

    const [mainApproval] = await sequelize.models.Approval.findOne({
      attributes: ['calculatedStatus'],
      where: {
        entityType: instance.entityType,
        entityId: instance.entityId,
        tier: 0,
      },
      transaction: options.transaction,
    });

    const allCalculatedStatuses = allApprovalTiers.map((approval) => approval.calculatedStatus);
    if (allCalculatedStatuses.any((status) => status === REPORT_STATUSES.NEEDS_ACTION)
      && mainApproval.calculatedStatus !== REPORT_STATUSES.NEEDS_ACTION) {
      await sequelize.models.Approval.update({
        calculatedStatus: REPORT_STATUSES.NEEDS_ACTION,
      }, {
        where: {
          entityType: instance.entityType,
          entityId: instance.entityId,
          tier: 0,
        },
        transaction: options.transaction,
      });
      return;
    }

    const tiers = allApprovalTiers.map((approval) => approval.tier);
    if (instance.tier !== Math.max(...tiers)) {
      await sequelize.models.Approval.update({
        submissionStatus: REPORT_STATUSES.SUBMITTED,
      }, {
        where: {
          entityType: instance.entityType,
          entityId: instance.entityId,
          tier: (instance.tier + 1),
        },
        transaction: options.transaction,
      });
      return;
    }

    if (allCalculatedStatuses.every((status) => status === REPORT_STATUSES.APPROVED)
      && mainApproval.calculatedStatus !== REPORT_STATUSES.APPROVED) {
      await sequelize.models.Approval.update({
        calculatedStatus: REPORT_STATUSES.APPROVED,
      }, {
        where: {
          entityType: instance.entityType,
          entityId: instance.entityId,
          tier: 0,
        },
        transaction: options.transaction,
      });
    }
  }
};

const propagateSubmissionStatusAcrossTiers = async (sequelize, instance, options) => {
  const changed = instance.changed();
  if (instance.tier === 0
    && Array.isArray(changed)
    && changed.includes('submissionStatus')) {
    switch (instance.submissionStatus) {
      case REPORT_STATUSES.DRAFT:
        await sequelize.models.Approval.update({ submissionStatus: REPORT_STATUSES.DRAFT }, {
          where: {
            entityType: instance.entityType,
            entityId: instance.entityId,
            tier: { [Op.not]: 0 },
          },
          transaction: options.transaction,
          individualHooks: true,
        });
        break;
      case REPORT_STATUSES.SUBMITTED:
        await sequelize.models.Approval.update({ submissionStatus: REPORT_STATUSES.SUBMITTED }, {
          where: {
            entityType: instance.entityType,
            entityId: instance.entityId,
            tier: 1,
          },
          transaction: options.transaction,
          individualHooks: true,
        });
        break;
      case REPORT_STATUSES.NEEDS_ACTION:
        break;
      case REPORT_STATUSES.APPROVED:
        break;
      case REPORT_STATUSES.DELETED:
        await sequelize.models.Approval.update({ submissionStatus: REPORT_STATUSES.DELETED }, {
          where: {
            entityType: instance.entityType,
            entityId: instance.entityId,
            tier: 1,
          },
          transaction: options.transaction,
          individualHooks: true,
        });
        break;
      default:
    }
  }
};

const beforeCreate = async (instance) => {
  copyStatus(instance);
};

const beforeUpdate = async (instance) => {
  copyStatus(instance);
};

const afterUpdate = async (sequelize, instance, options) => {
  await propagateSubmissionStatusToGoalsAndObjectives(sequelize, instance, options);
  await propagateApprovedStatusForGoalsAndObjectives(sequelize, instance, options);
  await automaticStatusChangeOnApprovalForGoals(sequelize, instance, options);
  await propagateApprovedCalculatedStatusAcrossTiers(sequelize, instance, options);
  await propagateSubmissionStatusAcrossTiers(sequelize, instance, options);
};

export {
  copyStatus,
  propagateSubmissionStatusToGoalsAndObjectives,
  propagateApprovedStatusForGoalsAndObjectives,
  automaticStatusChangeOnApprovalForGoals,
  propagateApprovedCalculatedStatusAcrossTiers,
  beforeCreate,
  beforeUpdate,
  afterUpdate,
};
