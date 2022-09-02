/* eslint-disable import/prefer-default-export */
import { Op } from 'sequelize';
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

import { removeUnusedGoalsObjectivesFromReport, reduceObjectives } from './goals';

export async function saveObjectivesForReport(objectives, report) {
  const updatedObjectives = await Promise.all(objectives.map(async (objective) => Promise
    .all(objective.recipientIds.map(async (otherEntityId) => {
      // Determine if this objective already exists.
      const existingObjective = await Objective.findOne({
        where: {
          title: objective.title,
          otherEntityId,
          status: { [Op.not]: 'Complete' },
        },
      });

      // If it already exists update the status else create it.
      let savedObjective;
      if (existingObjective) {
        await existingObjective.update({
          status: objective.status,
        }, { individualHooks: true });
        savedObjective = existingObjective;
      } else {
        // To prevent validation error exclude id.
        // In this case the user might have changed the title for objective.
        const { id, ...ObjPros } = objective;
        savedObjective = await Objective.create({
          ...ObjPros,
        });
      }
      // Find or create and activity report objective.
      const [aro] = await ActivityReportObjective.findOrCreate({
        where: {
          objectiveId: savedObjective.id,
          activityReportId: report.id,
        },
      });
      // Update activity report objective tta.
      await aro.update({ ttaProvided: objective.ttaProvided }, { individualHooks: true });
      return savedObjective;
    }))));

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
  const objectives = await Objective.findAll({
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

  return reduceObjectives(objectives);
}
