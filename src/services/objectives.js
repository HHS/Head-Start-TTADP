/* eslint-disable import/prefer-default-export */
import {
  Objective,
} from '../models';
import { removeUnusedGoalsObjectivesFromReport } from './goals';
import { cacheObjectiveMetadata } from './reportCache';

export async function saveObjectivesForReport(objectives, report) {
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

        await cacheObjectiveMetadata(newObjective, report.id, objective.ttaProvided);

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
        await cacheObjectiveMetadata(existingObjective, report.id, objective.ttaProvided);

        return existingObjective;
      }

      const [newObjective] = await Objective.findOrCreate({
        where: {
          status: objective.status,
          title: objective.title,
          otherEntityId: recipient,
        },
      });

      await cacheObjectiveMetadata(newObjective, report.id, objective.ttaProvided);

      return newObjective;
    }));
  }));

  const currentObjectives = updatedObjectives.flat();
  return removeUnusedGoalsObjectivesFromReport(report.id, currentObjectives);
}
