import { Op, WhereOptions, Model } from 'sequelize';
import { uniq } from 'lodash';
import db from '../models';
import {
  GOAL_STATUS,
  CREATION_METHOD,
  CURRENT_GOAL_SIMILARITY_VERSION,
} from '../constants';

const {
  GoalSimilarityGroup,
  GoalSimilarityGroupGoal,
  Grant,
  Goal,
  GoalTemplate,
} = db;

const similarityGroupAttributes = [
  'id',
  'recipientId',
  'userHasInvalidated',
  'finalGoalId',
];

interface IGoalShape {
  name: string;
  source: string;
  status: string;
  responsesForComparison: string;
  ids: number[];
  excludedIfNotAdmin: boolean;
}

interface SimilarityGroup {
  id: number;
  recipientId: number;
  userHasInvalidated: boolean;
  finalGoalId: number;
  goals: {
    id: number;
    status: string;
    goalTemplate?: {
      creationMethod: string;
    };
  }[];
  toJSON: () => SimilarityGroup;
}

export const flattenSimilarityGroupGoals = (group: SimilarityGroup) => ({
  ...group.toJSON(),
  goals: group.goals.map((goal) => goal.id),
});

export async function getSimilarityGroupById(
  similarityGroupId: number,
  where : WhereOptions = {},
  regionId: number = null,
) {
  const goalsInclude = [];
  if (regionId) {
    goalsInclude.push({
      model: Grant,
      as: 'grant',
      attributes: [],
      required: true,
      where: {
        regionId,
      },
    });
  }

  const group = await GoalSimilarityGroup.findOne({
    where: {
      ...where,
      id: similarityGroupId,
      version: CURRENT_GOAL_SIMILARITY_VERSION,
    },
    include: [
      {
        model: Goal,
        as: 'goals',
        attributes: ['id'],
        include: goalsInclude,
      },
    ],
    attributes: similarityGroupAttributes,
  });

  if (!group) {
    return null;
  }

  return flattenSimilarityGroupGoals(group);
}

export async function getSimilarityGroupByContainingGoalIds(
  goalIds: number[],
  where: WhereOptions = {},
) {
  const group = await GoalSimilarityGroup.findOne({
    attributes: similarityGroupAttributes,
    include: [
      {
        model: Goal,
        as: 'goals',
        attributes: ['id'],
      },
    ],
    where: {
      ...where,
      version: CURRENT_GOAL_SIMILARITY_VERSION,
      id: {
        [Op.in]: db.sequelize.literal(
          `(
            SELECT gs."goalSimilarityGroupId"
            FROM "GoalSimilarityGroupGoals" gs
            WHERE gs."goalId" IN (${goalIds.join(',')})
            GROUP BY gs."goalSimilarityGroupId"
            HAVING COUNT(DISTINCT gs."goalId") = ${goalIds.length}
          )`,
        ),
      },
    },
  });

  if (!group) {
    return null;
  }

  return flattenSimilarityGroupGoals(group);
}

export async function getSimilarityGroupsByRecipientId(
  recipientId: number,
  where: WhereOptions = {},
  userHasFeatureFlag = false,
  regionId: number = null,
) {
  const gsggWhere = userHasFeatureFlag ? {} : {
    excludedIfNotAdmin: false,
  };

  const goalsInclude = [{
    model: GoalTemplate,
    as: 'goalTemplate',
    attributes: ['creationMethod', 'id'],
    required: false,
  }, {
    model: GoalSimilarityGroupGoal,
    as: 'goalSimilarityGroupGoals',
    attributes: [],
    required: true,
    where: gsggWhere,
  }] as {
    model: Model;
    as: string;
    attributes: string[];
    required: boolean;
    where?: WhereOptions;
  }[];

  if (regionId) {
    goalsInclude.push({
      model: Grant,
      as: 'grant',
      attributes: [],
      required: true,
      where: {
        regionId,
      },
    });
  }

  const groups = await GoalSimilarityGroup.findAll({
    attributes: similarityGroupAttributes,
    where: {
      ...where,
      recipientId,
      version: CURRENT_GOAL_SIMILARITY_VERSION,
    },
    include: [{
      model: Goal,
      as: 'goals',
      attributes: ['id', 'goalTemplateId', 'status'],
      required: false,
      include: goalsInclude,
    }],
  });

  return groups.map(
    (gg: SimilarityGroup) => flattenSimilarityGroupGoals(gg),
  );
}

export async function setSimilarityGroupAsUserInvalidated(similarityGroupId: number) {
  return GoalSimilarityGroup.update(
    {
      userHasInvalidated: true,
    },
    {
      where: {
        id: similarityGroupId,
      },
      individualHooks: true,
    },
  );
}

export async function setSimilarityGroupAsUserMerged(
  id: number,
  finalGoalId: number,
) {
  return GoalSimilarityGroup.update(
    {
      finalGoalId,
    },
    {
      where: {
        id,
      },
      individualHooks: true,
    },
  );
}

export async function deleteSimilarityGroup(similarityGroupId: number) {
  await GoalSimilarityGroupGoal.destroy({
    where: {
      goalSimilarityGroupId: similarityGroupId,
    },
    individualHooks: true,
  });

  return GoalSimilarityGroup.destroy({
    where: {
      id: similarityGroupId,
    },
    individualHooks: true,
  });
}

export async function createSimilarityGroup(
  recipientId: number,
  goals: IGoalShape[],
) {
  // check for existing similarity group
  let group;

  if (goals && goals.length) {
    group = await getSimilarityGroupByContainingGoalIds(
      uniq(goals.map((goal) => goal.ids).flat()),
      { recipientId },
    );
  } else {
    [group] = await getSimilarityGroupsByRecipientId(
      recipientId,
      { finalGoalId: null, userHasInvalidated: false },
    );
  }

  if (group) {
    return group;
  }

  const newGroup = await GoalSimilarityGroup.create({
    recipientId,
    version: CURRENT_GOAL_SIMILARITY_VERSION,
  }, { individualHooks: true });

  const bulkCreates = [];

  goals.forEach((goal) => {
    goal.ids.forEach((goalId) => {
      bulkCreates.push({
        goalId,
        goalSimilarityGroupId: newGroup.id,
        excludedIfNotAdmin: goal.excludedIfNotAdmin,
      });
    });
  });

  await GoalSimilarityGroupGoal.bulkCreate(
    bulkCreates,
    { individualHooks: true },
  );

  return getSimilarityGroupById(newGroup.id);
}
