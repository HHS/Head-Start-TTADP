/* eslint-disable import/prefer-default-export */
const { Op } = require('sequelize');
const { EVENT_REPORT_STATUSES } = require('@ttahub/common');

const afterDestroy = async (sequelize, instance) => {
  //   first, we need to see if there is a national center that maps to this one
  const newNationalCenter = await sequelize.models.NationalCenter.findOne({
    where: { mapsTo: instance.id },
  });

  const sessionReports = await sequelize.models.SessionReportPilot.findAll({
    where: {
      [Op.and]: [
        {
          data: {
            status: EVENT_REPORT_STATUSES.IN_PROGRESS,
          },
        },
        sequelize.literal(`("SessionReportPilot"."data"->'objectiveTrainers')::text like '%${instance.name}%'`),
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

  // for each session report, we need
  // 1) to remove the deleted national center name from objectiveTrainers
  // 2) add the new national center name to objectiveTrainers

  await Promise.all((sessionReports || []).map(async (sessionReport) => {
    const { objectiveTrainers } = sessionReport.data;

    // just double checking in case our string compare failed us somehow
    if (!objectiveTrainers.includes(instance.name)) {
      return;
    }

    const newObjectiveTrainers = objectiveTrainers.filter((trainer) => trainer !== instance.name);
    if (newNationalCenter) {
      newObjectiveTrainers.push(newNationalCenter.name);
    }

    await sequelize.models.SessionReportPilot.update({
      data: {
        ...sessionReport.data,
        objectiveTrainers: newObjectiveTrainers,
      },
    }, {
      where: { id: sessionReport.id },
    });
  }));
};

export { afterDestroy };
