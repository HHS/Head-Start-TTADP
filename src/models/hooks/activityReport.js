const { Op } = require('sequelize');
const { REPORT_STATUSES } = require('../../constants');

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

const propagateApprovedStatus = async (sequelize, instance, options) => {
  const changed = instance.changed();
  if (Array.isArray(changed) && changed.includes('calculatedStatus')) {
    if (instance.previous('calculatedStatus') === REPORT_STATUSES.APPROVED
    && instance.calculatedStatus !== REPORT_STATUSES.APPROVED) {
      // eslint-disable-next-line max-len
      // TODO: Run extensive check and update where required all used goals and objectives as not onApprovedAR
      const objectives = await sequelize.models.ActivityReportObjective.findAll(
        {
          attributes: [
            ['"Objective".id', 'objectiveId'],
            [sequelize.cast(sequelize.fn('ARRAY_AGG', sequelize.fn('DISTINCT', sequelize.col('"ActivityReport".id'))), 'TEXT'), 'statuses'],
          ],
          group: '"Objective".id',
          distinct: true,
          where: { activityReportId: instance.id },
          include: [
            {
              model: sequelize.models.Objective,
              as: 'objectives',
              attributes: ['id'],
              required: true,
              include: [
                {
                  model: sequelize.models.ActivityReportObjective,
                  as: 'objectives',
                  attributes: ['id'],
                  required: true,
                  include: [
                    {
                      model: sequelize.models.ActivityReport,
                      as: 'objectives',
                      attributes: ['id'],
                      required: true,
                      where: {
                        calculatedStatus: { [Op.not]: REPORT_STATUSES.APPROVED },
                        activityReportId: { [Op.not]: instance.id },
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      );

      const affectedObjectives = objectives.filter((o) => !o.statuses.includes('approved')).map((o) => o.objectiveId);

      await sequelize.models.Objective.update(
        { onApprovedAR: false },
        {
          where: {
            id: { $in: affectedObjectives },
            onApprovedAR: true,
          },
          transaction: options.transaction,
        },
      );

      const goals = await sequelize.models.ActivityReportObjective.findAll(
        {
          attributes: [
            ['"Objective->Goal".id', 'goalId'],
            [sequelize.cast(sequelize.fn('ARRAY_AGG', sequelize.fn('DISTINCT', sequelize.col('"ActivityReport".id'))), 'TEXT'), 'statuses'],
          ],
          group: '"Objective".id',
          distinct: true,
          where: { activityReportId: instance.id },
          include: [
            {
              model: sequelize.models.Objective,
              as: 'objectives',
              required: true,
              include: [
                {
                  model: sequelize.models.Goal,
                  as: 'goals',
                  attributes: ['id'],
                  required: true,
                  include: [
                    {
                      model: sequelize.models.Objective,
                      as: 'objectives',
                      required: true,
                      include: [
                        {
                          model: sequelize.models.ActivityReport,
                          as: 'activityReports',
                          required: true,
                          where: {
                            calculatedStatus: { [Op.not]: REPORT_STATUSES.APPROVED },
                            activityReportId: { [Op.not]: instance.id },
                          },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
          transaction: options.transaction,
        },
      );

      const affectedGoals = goals.filter((o) => !o.statuses.includes('approved')).map((o) => o.goalId);

      await sequelize.models.Goals.update(
        { onApprovedAR: false },
        {
          where: {
            id: { $in: affectedGoals },
            onApprovedAR: true,
          },
          transaction: options.transaction,
        },
      );
    } else if (instance.previous('calculatedStatus') !== REPORT_STATUSES.APPROVED
    && instance.calculatedStatus === REPORT_STATUSES.APPROVED) {
      const objectivesAndGoals = await sequelize.models.ActivityReportObjective.findAll(
        {
          attributes: ['objectiveId'],
          where: { activityReportId: instance.id },
          include: [
            {
              model: sequelize.models.Objective,
              as: 'objectives',
              attributes: ['goalId'],
            },
          ],
          transaction: options.transaction,
        },
      );
      await sequelize.models.Objective.update(
        { onApprovedAR: true },
        {
          where: {
            id: { $in: objectivesAndGoals.map((o) => o.objectiveId) },
            onApprovedAR: false,
          },
          transaction: options.transaction,
        },
      );
      await sequelize.models.Goals.update(
        { onApprovedAR: true },
        {
          where: {
            id: { $in: objectivesAndGoals.map((o) => o.goalId) },
            onApprovedAR: false,
          },
          transaction: options.transaction,
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
    && instance.calculatedStatus === REPORT_STATUSES.APPROVED) {
    const goals = await sequelize.models.Goal.findAll(
      {
        where: {
          status: ['Draft', 'Not Started'],
        },
        include: [
          {
            model: sequelize.models.ActivityReport,
            as: 'activityReports',
            required: true,
            where: { activityReportId: instance.id },
          },
        ],
        transaction: options.transaction,
      },
    );
    await Promise.all(goals.map(async (goal) => {
      goal.set('status', 'In Progress');
      return goal.save();
    }));
  }
};

const beforeCreate = async (instance) => {
  copyStatus(instance);
};

const beforeUpdate = async (instance) => {
  copyStatus(instance);
};
const afterUpdate = async (sequelize, instance, options) => {
  await propagateApprovedStatus(sequelize, instance, options);
  await automaticStatusChangeOnAprovalForGoals(sequelize, instance, options);
};

export {
  copyStatus,
  propagateApprovedStatus,
  automaticStatusChangeOnAprovalForGoals,
  beforeCreate,
  beforeUpdate,
  afterUpdate,
};
