/* eslint-disable import/prefer-default-export */
import {
  Objective,
  ActivityReportObjective,
} from '../models';
import { removeUnusedGoalsObjectivesFromReport } from './goals';

export async function saveObjectivesForReport(objectives, report) {
  // TODO: ttaProvided needs to move from objective to ActivityReportObjective
  const objectivesToCreate = objectives.map(({
    ttaProvided,
    title,
    status,
    id,
    new: isNew,
  }) => {
    const dbId = isNew ? undefined : id;
    return {
      id: dbId, ttaProvided, title, status,
    };
  });

  const currentObjectives = await Promise.all(
    objectivesToCreate.map(async (o) => {
      const [obj] = await Objective.upsert(
        o,
        { returning: true },
      );
      return obj;
    }),
  );

  const savedObjectiveIds = currentObjectives.map((o) => o.id);

  await Promise.all(
    savedObjectiveIds.map((objectiveId) => ActivityReportObjective.findOrCreate({
      where: {
        objectiveId,
        activityReportId: report.id,
      },
    })),
  );

  return removeUnusedGoalsObjectivesFromReport(report.id, currentObjectives);
}
