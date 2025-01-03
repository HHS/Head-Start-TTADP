const { Op } = require('sequelize');
const { REPORT_STATUSES } = require('@ttahub/common');
const { GOAL_COLLABORATORS } = require('../../constants');
const {
  currentUserPopulateCollaboratorForType,
  removeCollaboratorsForType,
} = require('../helpers/genericCollaborator');

const processForEmbeddedResources = async (sequelize, instance, options) => {
  // eslint-disable-next-line global-require
  const { calculateIsAutoDetectedForActivityReportGoal, processActivityReportGoalForResourcesById } = require('../../services/resource');
  const changed = instance.changed() || Object.keys(instance);
  if (calculateIsAutoDetectedForActivityReportGoal(changed)) {
    await processActivityReportGoalForResourcesById(instance.id);
  }
};

const propagateDestroyToMetadata = async (sequelize, instance, options) => Promise.all(
  [
    sequelize.models.ActivityReportGoalResource,
    sequelize.models.ActivityReportGoalFieldResponse,
  ].map(async (model) => model.destroy({
    where: {
      activityReportGoalId: instance.id,
    },
    individualHooks: true,
    hookMetadata: { goalId: instance.goalId },
    transaction: options.transaction,
  })),
);

const recalculateOnAR = async (sequelize, instance, options) => {
  await sequelize.query(`
    WITH
      "GoalOnReport" AS (
        SELECT
          g."id",
          COUNT(arg.id) > 0 "onAR"
        FROM "Goals" g
        LEFT JOIN "ActivityReportGoals" arg
        ON g.id = arg."goalId"
        WHERE g."id" = ${instance.goalId}
        AND arg.id != ${instance.id}
        GROUP BY g."id"
      )
    UPDATE "Goals" g
    SET "onAR" = gr."onAR"
    FROM "GoalOnReport" gr
    WHERE g.id = gr.id;
  `, { transaction: options.transaction });
};

const autoPopulateLinker = async (sequelize, instance, options) => {
  const { goalId, activityReportId } = instance;
  return currentUserPopulateCollaboratorForType(
    'goal',
    sequelize,
    options.transaction,
    goalId,
    GOAL_COLLABORATORS.LINKER,
    { activityReportIds: [activityReportId] },
  );
};

const autoCleanupLinker = async (sequelize, instance, options) => {
  const { goalId, activityReportId } = instance;
  return removeCollaboratorsForType(
    'goal',
    sequelize,
    options.transaction,
    goalId,
    GOAL_COLLABORATORS.LINKER,
    { activityReportIds: [activityReportId] },
  );
};

const destroyLinkedSimilarityGroups = async (sequelize, instance, options) => {
  // calculatedStatus is passed in when this is called
  // in /src/models/hooks/activityReport.js
  // it is always REPORT_STATUSES.DELETED there, so we don't need to check it
  // otherwise, on a normal AR goal instance, this will be undefined
  const { goalId, calculatedStatus } = instance;

  if (!calculatedStatus) {
    const report = await sequelize.models.ActivityReport.findOne({
      attributes: ['calculatedStatus'],
      where: {
        id: instance.activityReportId,
      },
      transaction: options.transaction,
    });

    if (!report || report.calculatedStatus === REPORT_STATUSES.APPROVED) {
      return;
    }
  }

  // we need to find the recipient that has the goal
  const recipient = await sequelize.models.Recipient.findOne({
    attributes: ['id'],
    include: [
      {
        model: sequelize.models.Grant,
        as: 'grants',
        attributes: ['id'],
        required: true,
        include: [
          {
            model: sequelize.models.Goal,
            as: 'goals',
            attributes: ['id'],
            required: true,
            where: {
              id: goalId,
            },
          },
        ],
      },
    ],
    transaction: options.transaction,
  });

  // we need to destroy all similarity groups for that recipient
  // (that haven't been invalidated)
  const similarityGroups = await sequelize.models.GoalSimilarityGroup.findAll({
    attributes: ['id'],
    where: {
      recipientId: recipient.id,
      userHasInvalidated: false,
      finalGoalId: null,
    },
    transaction: options.transaction,
  });

  if (!similarityGroups.length) {
    return;
  }

  await sequelize.models.GoalSimilarityGroupGoal.destroy({
    where: {
      goalSimilarityGroupId: similarityGroups.map((sg) => sg.id),
    },
    transaction: options.transaction,
  });

  await sequelize.models.GoalSimilarityGroup.destroy({
    where: {
      recipientId: recipient.id,
      userHasInvalidated: false,
      finalGoalId: null,
    },
    transaction: options.transaction,
  });
};

const updateOnARAndOnApprovedARForMergedGoals = async (sequelize, instance) => {
  const changed = instance.changed();

  // Check if both originalGoalId and goalId have been changed and originalGoalId is not null
  if (Array.isArray(changed)
    && changed.includes('originalGoalId')
    && changed.includes('goalId')
    && instance.originalGoalId !== null) {
    const { goalId } = instance;

    // Check if the ActivityReport linked to this ActivityReportGoal has a
    // calculatedStatus of 'approved'
    const approvedActivityReports = await sequelize.models.ActivityReport.count({
      where: {
        calculatedStatus: 'approved',
        id: instance.activityReportId, // Use the activityReportId from the instance
      },
    });

    const onApprovedAR = approvedActivityReports > 0;

    // Update only if the current values differ
    await sequelize.models.Goal.update(
      { onAR: true, onApprovedAR },
      {
        where: {
          id: goalId,
          [Op.or]: [
            // Update if onAR is not already true
            { onAR: { [Op.ne]: true } },
            // Update if onApprovedAR differs
            { onApprovedAR: { [Op.ne]: onApprovedAR } },
          ],
        },
        individualHooks: true, // Ensure individual hooks are triggered
      },
    );
  }
};

const afterCreate = async (sequelize, instance, options) => {
  await processForEmbeddedResources(sequelize, instance, options);
  await autoPopulateLinker(sequelize, instance, options);
  await destroyLinkedSimilarityGroups(sequelize, instance, options);
};

const beforeValidate = async (sequelize, instance, options) => {
  if (!Array.isArray(options.fields)) {
    options.fields = []; //eslint-disable-line
  }
};

const beforeDestroy = async (sequelize, instance, options) => {
  await propagateDestroyToMetadata(sequelize, instance, options);
  await autoCleanupLinker(sequelize, instance, options);
};

const afterDestroy = async (sequelize, instance, options) => {
  await recalculateOnAR(sequelize, instance, options);
  await destroyLinkedSimilarityGroups(sequelize, instance, options);
};

const afterUpdate = async (sequelize, instance, options) => {
  await processForEmbeddedResources(sequelize, instance, options);
  await destroyLinkedSimilarityGroups(sequelize, instance, options);
  await updateOnARAndOnApprovedARForMergedGoals(sequelize, instance);
};

export {
  beforeValidate,
  processForEmbeddedResources,
  recalculateOnAR,
  propagateDestroyToMetadata,
  destroyLinkedSimilarityGroups,
  updateOnARAndOnApprovedARForMergedGoals,
  afterCreate,
  beforeDestroy,
  afterDestroy,
  afterUpdate,
};
