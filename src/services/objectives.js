/* eslint-disable import/prefer-default-export */
import {
  Objective,
  ActivityReportObjective,
} from '../models';

export async function saveObjectivesForReport(objectives, report, transaction) {
  const reportObjectives = await ActivityReportObjective.findAll({
    where: {
      activityReportId: report.id,
    },
  });

  const objectiveIds = reportObjectives.map((reportObjective) => reportObjective.objectiveId);
  await ActivityReportObjective.destroy({
    where: {
      activityReportId: report.id,
    },
  },
  { transaction });

  await Objective.destroy({
    where: {
      id: objectiveIds,
    },
  },
  { transaction });

  await Promise.all(objectives.map(async (objective) => {
    const { id, ...objectiveForDb } = objective;
    const createdObjective = await Objective.create(objectiveForDb, { transaction });

    await ActivityReportObjective.create({
      objectiveId: createdObjective.id,
      activityReportId: report.id,
    },
    { transaction });
  }));
}
