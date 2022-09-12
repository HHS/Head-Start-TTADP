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
import { removeUnusedGoalsObjectivesFromReport, reduceObjectives, saveObjectiveAssociations } from './goals';
import { cacheObjectiveMetadata } from './reportCache';

export async function saveObjectivesForReport(objectives, report) {
  const updatedObjectives = await Promise.all(objectives.map(async (objective) => Promise
    .all(objective.recipientIds.map(async (otherEntityId) => {
      const {
        roles: roleNames, topics, files, resources,
      } = objective;

      const roles = await Role.findAll({
        where: {
          fullName: roleNames,
        },
      });

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
          title: objective.title,
        }, { individualHooks: true });
        savedObjective = existingObjective;
      } else {
        // To prevent validation error exclude id.
        // In this case the user might have changed the title for objective.
        const { id, ...ObjPros } = objective;
        savedObjective = await Objective.create({
          ...ObjPros,
          otherEntityId,
        });
      }

      const deleteUnusedAssociations = false;

      const metadata = await saveObjectiveAssociations(
        savedObjective,
        resources,
        topics,
        roles,
        files,
        deleteUnusedAssociations,
      );

      await cacheObjectiveMetadata(savedObjective, report.id, {
        ...metadata,
        ttaProvided: objective.ttaProvided,
      });

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
