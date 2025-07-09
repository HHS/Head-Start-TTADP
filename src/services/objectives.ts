import { Op } from 'sequelize';
import { uniqBy } from 'lodash';
import { GOAL_STATUS, OBJECTIVE_STATUS } from '../constants';
import db from '../models';
import { removeUnusedGoalsObjectivesFromReport } from './standardGoals';
import { cacheObjectiveMetadata } from './reportCache';
import extractObjectiveAssociationsFromActivityReportObjectives from '../goalServices/extractObjectiveAssociationsFromActivityReportObjectives';
import { IOtherEntityObjectiveModelInstance, IOtherEntityObjective } from '../goalServices/types';

const {
  Objective,
  ActivityReportObjective,
  Goal,
  Grant,
  Topic,
  File,
  Course,
  Resource,
  sequelize,
} = db;

export async function getObjectiveRegionAndGoalStatusByIds(ids: number[]) {
  return Objective.findAll({
    attributes: ['id', 'goalId', 'status'],
    where: {
      id: ids,
    },
    include: [
      {
        model: Goal,
        as: 'goal',
        attributes: ['id', 'grantId', 'status'],
        required: true,
        include: [
          {
            as: 'grant',
            model: Grant,
            required: true,
            attributes: ['id', 'regionId'],
          },
        ],
      },
    ],
  }) as {
    id: number,
    goalId: number,
    status: string,
    onApprovedAR?: boolean,
    overrideStatus?: string,
    goal: {
      id: number,
      status: string,
      grant: {
        regionId: number,
      },
    },
  }[];
}

export async function saveObjectivesForReport(objectives, report) {
  const updatedObjectives = await Promise.all(objectives.map(async (objective, index) => Promise
    .all(objective.recipientIds.map(async (otherEntityId) => {
      const {
        topics, files, resources, courses, objectiveCreatedHere, citations,
      } = objective;

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
        const {
          id,
          ttaProvided,
          supportType,
          ...objProps
        } = objective;
        savedObjective = await Objective.create({
          ...objProps,
          otherEntityId,
          createdVia: 'activityReport',
        });
      }

      await cacheObjectiveMetadata(savedObjective, report.id, {
        resources,
        topics,
        files,
        citations,
        courses,
        ttaProvided: objective.ttaProvided,
        supportType: objective.supportType,
        order: index,
        objectiveCreatedHere,
      });

      return savedObjective;
    }))));

  const currentObjectives = updatedObjectives.flat();
  return removeUnusedGoalsObjectivesFromReport(report.id, currentObjectives);
}

export async function getObjectiveById(objectiveId: number) {
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

function reduceOtherEntityObjectives(newObjectives: IOtherEntityObjective[]) {
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

    const { id } = objective;

    if (exists) {
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

      exists.courses = uniqBy([
        ...exists.courses,
        ...objective.courses,
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

    const supportType = objective.activityReportObjectives
      && objective.activityReportObjectives[0]
      && objective.activityReportObjectives[0].supportType
      ? objective.activityReportObjectives[0].supportType : null;

    const arOrder = objective.activityReportObjectives
      && objective.activityReportObjectives[0]
      && objective.activityReportObjectives[0].arOrder
      ? objective.activityReportObjectives[0].arOrder : null;

    const createdHere = objective.activityReportObjectives
      && objective.activityReportObjectives[0]
      && objective.activityReportObjectives[0].objectiveCreatedHere
      ? objective.activityReportObjectives[0].objectiveCreatedHere : false;

    return [...objectives, {
      ...objective,
      id,
      value: id,
      ids: [id],
      ttaProvided,
      supportType,
      status: objectiveStatus, // the status from above, derived from the activity report objective
      objectiveCreatedHere: createdHere,
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

export async function getObjectivesByReportId(reportId: number) {
  const objectives = await Objective.findAll({
    attributes: {
      include: [
        [sequelize.col('activityReportObjectives.objectiveCreatedHere'), 'objectiveCreatedHere'],
      ],
    },
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
        include: [
          {
            model: Topic,
            as: 'topics',
          },
          {
            model: Course,
            as: 'courses',
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
      },
    ],
  }) as IOtherEntityObjectiveModelInstance[];

  return reduceOtherEntityObjectives(objectives
    .map((objective) => ({
      ...objective.toJSON(),
      topics: extractObjectiveAssociationsFromActivityReportObjectives(
        objective.activityReportObjectives,
        'topics',
      ),
      courses: extractObjectiveAssociationsFromActivityReportObjectives(
        objective.activityReportObjectives,
        'courses',
      ),
      resources: extractObjectiveAssociationsFromActivityReportObjectives(
        objective.activityReportObjectives,
        'resources',
      ),
      files: extractObjectiveAssociationsFromActivityReportObjectives(
        objective.activityReportObjectives,
        'files',
      ),
    })));
}

/**
 * Verifies if the objective status transition is valid
 *
 * @param objective Object { goal: { status: string }, status: string}
 * @param status string
 * @returns boolean
 */
export function verifyObjectiveStatusTransition(objective: {
  goal: { status: string },
  status: string,
}, status: string) {
  if (objective.goal.status === GOAL_STATUS.CLOSED) {
    return false;
  }

  if (objective.status === OBJECTIVE_STATUS.COMPLETE && status === OBJECTIVE_STATUS.NOT_STARTED) {
    return false;
  }

  return true;
}

export function updateObjectiveStatusByIds(
  objectiveIds: number[],
  status: string,
  closeSuspendReason = '',
  closeSuspendContext = '',
) {
  return Objective.update({
    status,
    closeSuspendReason,
    closeSuspendContext,
  }, {
    where: {
      id: objectiveIds,
    },
    individualHooks: true,
  });
}
