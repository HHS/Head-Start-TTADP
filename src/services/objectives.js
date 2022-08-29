/* eslint-disable import/prefer-default-export */
import {
  Objective,
  ActivityReportObjective,
  Goal,
  Grant,
} from '../models';
import { removeUnusedGoalsObjectivesFromReport } from './goals';

export async function saveObjectivesForReport(objectives, report) {
  const activityRecipientIds = report.activityRecipients.map(
    (g) => g.activityRecipientId,
  );

  const updatedObjectives = await Promise.all(objectives.map(async (objective) => {
    if (objective.isNew) {
      return Promise.all(activityRecipientIds.map(async (recipient) => {
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

        await aro.update({ ttaProvided: objective.ttaProvided }, { individualHooks: true });

        return newObjective;
      }));
    }
    return Promise.all(activityRecipientIds.map(async (recipient) => {
      const existingObjective = await Objective.findOne({
        where: {
          id: objective.id,
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
        }, { individualHooks: true });

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

export async function getObjectiveById(objectiveId) {
  return Objective.findOne({
    attributes: ['id', 'title', 'status'],
    where: {
      id: objectiveId,
    },
    include: [
      {
        model: Goal,
        as: 'goal',
        include: [
          {
            model: Grant,
            as: 'grant',
            attributes: ['regionId'],
          },
        ],
      },
    ],
  });
}
