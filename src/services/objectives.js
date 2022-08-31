/* eslint-disable import/prefer-default-export */
import {
  Objective,
  ActivityReportObjective,
  Goal,
  Grant,
  Role,
  Topic,
  File,
  ObjectiveResource,
} from '../models';
import { removeUnusedGoalsObjectivesFromReport } from './goals';

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

export async function getObjectivesByReportId(reportId) {
  return Objective.findAll({
    model: Objective,
    include: [
      {
        model: ActivityReportObjective,
        as: 'activityReportObjectives',
        where: {
          activityReportId: reportId,
        },
        required: true,
      },
      {
        model: Role,
        as: 'roles',
      },
      {
        model: Topic,
        as: 'topics',
        // these need to be renamed to match the frontend form names
        attributes: [['name', 'label'], ['id', 'value']],
      },
      {
        model: ObjectiveResource,
        as: 'resources',
        attributes: [['userProvidedUrl', 'value']],
      },
      {
        model: File,
        as: 'files',
      },
    ],
  });
}
