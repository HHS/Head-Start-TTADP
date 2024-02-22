import { Op } from 'sequelize';

const autoPopulateOnAR = (sequelize, instance, options) => {
  // eslint-disable-next-line no-prototype-builtins
  if (instance.onAR === undefined
    || instance.onAR === null) {
    instance.set('onAR', false);
    if (!options.fields.includes('onAR')) {
      options.fields.push('onAR');
    }
  }
};

const autoPopulateOnApprovedAR = (sequelize, instance, options) => {
  // eslint-disable-next-line no-prototype-builtins
  if (instance.onApprovedAR === undefined
    || instance.onApprovedAR === null) {
    instance.set('onApprovedAR', false);
    if (!options.fields.includes('onApprovedAR')) {
      options.fields.push('onApprovedAR');
    }
  }
};

const beforeValidate = async (sequelize, instance, options) => {
  if (!Array.isArray(options.fields)) {
    options.fields = []; //eslint-disable-line
  }
  autoPopulateOnAR(sequelize, instance, options);
  autoPopulateOnApprovedAR(sequelize, instance, options);
};

const syncActivityReportGoalFieldResponses = async (sequelize, instance, options) => {
  const changed = instance.changed();
  if (instance.id !== null
    && Array.isArray(changed)
    && changed.includes('response')) {
    // Update all ActivityReportGoalFieldResponses with this goalId and promptId.
    const { goalId, goalTemplateFieldPromptId } = instance;

    // Get ids to update (sequelize update doesn't support joins...)
    const idsToUpdate = await sequelize.models.ActivityReportGoalFieldResponse.findAll(
      {
        attributes: ['id', 'activityReportGoalId'],
        where: {
          goalTemplateFieldPromptId,
        },
        include: [{
          attributes: ['id', 'activityReportId'],
          required: true,
          model: sequelize.models.ActivityReportGoal,
          as: 'activityReportGoal',
          where: {
            goalId,
          },
          include: [
            {
              attributes: ['id', 'calculatedStatus'],
              required: true,
              model: sequelize.models.ActivityReport,
              as: 'activityReport',
              where: {
                calculatedStatus: {
                  [Op.ne]: 'approved', // Only update ActivityReportGoalFieldResponses on unapproved ARs.
                },
              },
            },
          ],
        },
        ],
      },
    );

    // Get ids to update.
    const ids = idsToUpdate.map((item) => item.id);

    // Perform the update.
    await sequelize.models.ActivityReportGoalFieldResponse.update(
      { response: instance.response },
      {
        where: {
          id: ids,
        },
      },
    );

    // Get a list of activity report ids from idsToUpdate.
    const activityReportIds = idsToUpdate.map((item) => item.activityReportGoal.activityReportId);
    // We need to update the AR createdAt so we don't pull from outdated local storage.
    if (activityReportIds.length > 0) {
      await sequelize.query(`UPDATE "ActivityReports" SET "updatedAt" = '${new Date().toISOString()}' WHERE id IN (${activityReportIds.join(',')})`);
    }
  }
};

const afterUpdate = async (sequelize, instance, options) => {
  await syncActivityReportGoalFieldResponses(sequelize, instance, options);
};

export {
  autoPopulateOnAR,
  autoPopulateOnApprovedAR,
  beforeValidate,
  afterUpdate,
};
