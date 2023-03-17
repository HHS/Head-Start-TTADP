import { Op } from 'sequelize';
import { uniqBy } from 'lodash';
import { OBJECTIVE_STATUS } from '../constants';
import {
  Objective,
  ActivityReportObjective,
  Goal,
  Grant,
  Topic,
  File,
  Resource,
} from '../models';
import { removeUnusedGoalsObjectivesFromReport, saveObjectiveAssociations } from './goals';
import { cacheObjectiveMetadata } from './reportCache';

export async function saveObjectivesForReport(objectives, report) {
  const updatedObjectives = await Promise.all(objectives.map(async (objective, index) => Promise
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
          createdVia: 'activityReport',
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
        order: index,
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
        required: false,
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

function reduceOtherEntityObjectives(newObjectives) {
  const objectivesToSort = newObjectives.reduce((objectives, objective) => {
    // check the activity report objective status
    const objectiveStatus = objective.activityReportObjectives
      && objective.activityReportObjectives[0]
      && objective.activityReportObjectives[0].status
      ? objective.activityReportObjectives[0].status : objective.status;

    // objectives represent the accumulator in the find below
    // objective is the objective as it is returned from the API
    const exists = objectives.find((o) => (
      o.title === objective.title && o.status === objectiveStatus
    ));

    if (exists) {
      const id = objective.getDataValue('id') ? objective.getDataValue('id') : objective.getDataValue('value');
      exists.ids = [...exists.ids, id];

      // we can dedupe these using lodash
      exists.resources = uniqBy([
        ...exists.resources,
        ...objective.resources,
      ], 'value');

      exists.topics = uniqBy([
        ...exists.topics,
        ...objective.topics,
      ], 'id');

      exists.files = uniqBy([
        ...exists.files,
        ...objective.files,
      ], 'key');

      return objectives;
    }

    // since this method is used to rollup both objectives on and off activity reports
    // we need to handle the case where there is TTA provided and TTA not provided
    // NOTE: there will only be one activity report objective, it is queried by activity report id
    const ttaProvided = objective.activityReportObjectives
      && objective.activityReportObjectives[0]
      && objective.activityReportObjectives[0].ttaProvided
      ? objective.activityReportObjectives[0].ttaProvided : null;

    const arOrder = objective.activityReportObjectives
      && objective.activityReportObjectives[0]
      && objective.activityReportObjectives[0].arOrder
      ? objective.activityReportObjectives[0].arOrder : null;

    const id = objective.getDataValue('id') ? objective.getDataValue('id') : objective.getDataValue('value');

    return [...objectives, {
      ...objective.dataValues,
      value: id,
      ids: [id],
      ttaProvided,
      status: objectiveStatus, // the status from above, derived from the activity report objective
      isNew: false,
      arOrder,
    }];
  }, []);

  // Sort by AR Order in place.
  objectivesToSort.sort((o1, o2) => {
    if (o1.arOrder < o2.arOrder) {
      return -1;
    }
    return 1;
  });

  return objectivesToSort;
}

export async function getObjectivesByReportId(reportId) {
  const objectives = await Objective.findAll({
    model: Objective,
    where: {
      goalId: { [Op.is]: null },
      otherEntityId: { [Op.not]: null },
    },
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
      },
      {
        model: Resource,
        as: 'resources',
        // these need to be renamed to match the frontend form names
        attributes: [['url', 'value']],
      },
      {
        model: File,
        as: 'files',
      },
    ],
  });

  return reduceOtherEntityObjectives(objectives);
}
