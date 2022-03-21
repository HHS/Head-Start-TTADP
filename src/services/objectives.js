/* eslint-disable import/prefer-default-export */
import { Op } from 'sequelize';
import {
  Objective,
  ActivityReportObjective,
} from '../models';

export async function saveObjectivesForReport(objectives, report, transaction) {
  const objectivesToCreate = objectives.filter((obj) => obj.new).map(({
    ttaProvided,
    title,
    status,
  }) => (
    { ttaProvided, title, status }
  ));

  const newObjectives = await Promise.all(
    objectivesToCreate.map((o) => Objective.create(o, { transaction })),
  );

  const existingObjectiveIds = objectives.filter((obj) => !obj.new).map((o) => o.id);

  const allObjectiveIds = [
    ...newObjectives.map((o) => o.id),
    ...existingObjectiveIds,
  ];

  const activityReportObjectives = await Promise.all(
    allObjectiveIds.map((objectiveId) => ActivityReportObjective.findOrCreate({
      where: {
        objectiveId,
        activityReportId: report.id,
      },
      transaction,
    })),
  );

  // cleanup old data
  await ActivityReportObjective.destroy({
    where: {
      activityReportId: report.id,
      id: {
        [Op.notIn]: activityReportObjectives.map(([aro]) => aro.id),
      },
    },
    transaction,
  });

  const allObjectivesFromActivityReportObjectives = await ActivityReportObjective.findAll({
    attributes: ['objectiveId'],
    where: {
      activityReportId: report.id,
    },
  });

  return Objective.destroy({
    where: {
      [Op.and]: [
        {
          id: {
            [Op.notIn]: allObjectiveIds,
          },
        },
        {
          id: {
            [Op.in]: allObjectivesFromActivityReportObjectives.map((aro) => aro.objectiveId),
          },
        },
      ],
    },
    transaction,
  });
}
