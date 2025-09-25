/* eslint-disable import/prefer-default-export */
const { Op } = require('sequelize');
const { EVENT_REPORT_STATUSES } = require('@ttahub/common');

const updateExistingSessionReports = async (sequelize, instance, options, isDestroy = false) => {
  // Description: We need to update the session reports trainer data
  //  if the NC name changed OR it was destroyed.
  const changed = instance.changed();
  if ((Array.isArray(changed)
    && changed.includes('name')) || isDestroy) {
    // Get the old national center name.
    const oldNationalCenterName = isDestroy ? instance.name : instance.previous('name');
    // Find all session reports that contain the
    // old national center name as a data.objectiveTrainers value.
    const sessionReports = await sequelize.models.SessionReport.findAll({
      where: {
        [Op.and]: [
          {
            data: {
              status: EVENT_REPORT_STATUSES.IN_PROGRESS,
            },
          },
          sequelize.literal(`("SessionReport"."data"->'objectiveTrainers')::text like '%${oldNationalCenterName}%'`),
        ],
      },
      include: [{
        model: sequelize.models.EventReportPilot,
        as: 'event',
        required: true,
        where: {
          data: {
            status: {
              [Op.not]: EVENT_REPORT_STATUSES.COMPLETE,
            },
          },
        },
      }],
    });

    // For each session report that contains the old national center name:
    // 1) Remove the old name from objectiveTrainers
    // 2) Add the new name to objectiveTrainers
    await Promise.all((sessionReports || []).map(async (sessionReport) => {
      const { objectiveTrainers } = sessionReport.data;

      // Double checking in case our string compare failed us somehow.
      if (!objectiveTrainers.includes(oldNationalCenterName)) {
        return;
      }

      // Get all trainers except the old name.
      const newObjectiveTrainersWithoutOld = objectiveTrainers.filter(
        (trainer) => trainer !== oldNationalCenterName,
      );

      // Add the new name to the list of trainers.
      if (instance && !isDestroy) {
        newObjectiveTrainersWithoutOld.push(instance.name);
      }

      // Update with the new trainers list.
      await sequelize.models.SessionReport.update({
        data: {
          ...sessionReport.data,
          objectiveTrainers: newObjectiveTrainersWithoutOld,
        },
      }, {
        where: { id: sessionReport.id },
        transaction: options.transaction,
      });
    }));
  }
};

const afterDestroy = async (sequelize, instance, options) => {
  await updateExistingSessionReports(sequelize, instance, options, true);
};

const afterUpdate = async (sequelize, instance, options) => {
  await updateExistingSessionReports(sequelize, instance, options);
};

export { afterDestroy, afterUpdate };
