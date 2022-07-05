/* eslint-disable import/prefer-default-export */
import {
  Objective,
  ActivityReportObjective,
} from '../models';
import { removeUnusedGoalsObjectivesFromReport } from './goals';

export async function saveObjectivesForReport(objectives, report) {
  if (!objectives) {
    return null;
  }

  const updatedObjectives = await Promise.all(objectives.map(async (objective) => {
    if (objective.isNew) {
      return Promise.all(objective.recipientIds.map(async (recipient) => {
        const [newObjective] = await Objective.findOrCreate({
          where: {
            status: objective.status,
            title: objective.title,
            otherEntityId: recipient,
          },
        });

        const [aro] = await ActivityReportObjective.findOrCreate({
          where: {
            objectiveId: newObjective.id,
            activityReportId: report.id,
          },
        });

        await aro.update({ ttaProvided: objective.ttaProvided });

        return newObjective;
      }));
    }
    return Promise.all(objective.recipientIds.map(async (recipient) => {
      const existingObjective = await Objective.findOne({
        where: {
          id: objective.ids,
          otherEntityId: recipient,
        },
      });

      if (existingObjective) {
        await ActivityReportObjective.findOrCreate({
          where: {
            ttaProvided: objective.ttaProvided,
            objectiveId: existingObjective.id,
            activityReportId: report.id,
          },
        });

        await existingObjective.update({
          status: objective.status,
          title: objective.title,
        });

        return existingObjective;
      }

      const [newObjective] = await Objective.findOrCreate({
        where: {
          status: objective.status,
          title: objective.title,
          otherEntityId: recipient,
        },
      });

      await ActivityReportObjective.create({
        where: {
          ttaProvided: objective.ttaProvided,
          objectiveId: newObjective.id,
          activityReportId: report.id,
        },
      });

      return newObjective;
    }));
  }));

  const currentObjectives = updatedObjectives.flat();
  return removeUnusedGoalsObjectivesFromReport(report.id, currentObjectives);
}
