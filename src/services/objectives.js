import { Op } from 'sequelize';
import { OBJECTIVE_STATUS } from '../constants';
import {
  Objective,
  ActivityReportObjective,
  Goal,
  Grant,
  Topic,
  File,
  ObjectiveResource,
} from '../models';
import { removeUnusedGoalsObjectivesFromReport, reduceObjectives, saveObjectiveAssociations } from './goals';
import { cacheObjectiveMetadata } from './reportCache';

export async function saveObjectivesForReport(objectives, report) {
  const updatedObjectives = await Promise.all(objectives.map(async (objective) => Promise
    .all(objective.recipientIds.map(async (otherEntityId) => {
      const { topics, files, resources } = objective;

      // Determine if this objective already exists.
      let existingObjective;

      // 1. Find existing by id and entity and id.
      if (objective.ids
            && objective.ids.length) {
        const validIdsToCheck = objective.ids.filter((id) => typeof id === 'number');
        existingObjective = await Objective.findOne({
          where: {
            // We are checking all objective id's but only one should link to the entity.
            id: validIdsToCheck,
            otherEntityId,
            status: { [Op.not]: OBJECTIVE_STATUS.COMPLETE },
          },
        });
      }

      // 2. Find by title and 'entity' id.
      if (!existingObjective) {
        // Determine if this objective already exists.
        existingObjective = await Objective.findOne({
          where: {
            title: objective.title,
            otherEntityId,
            status: { [Op.not]: OBJECTIVE_STATUS.COMPLETE },
          },
        });
      }

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
    attributes: [
      'id',
      'title',
      'status',
      'onApprovedAR',
      'otherEntityId',
    ],
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
