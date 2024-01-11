import { Op, WhereOptions } from 'sequelize';
import db from '../models';
import {
  GOAL_STATUS,
  CREATION_METHOD,
} from '../constants';

const {
  GoalSimilarityGroup,
  GoalSimilarityGroupGoal,
  Goal,
  GoalTemplate,
} = db;

const similarityGroupAttributes = [
  'id',
  'recipientId',
  'userHasInvalidated',
  'finalGoalId',
];

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

const flattenSimilarityGroupGoals = (group: SimilarityGroup, allowClosedCuratedGoal = false) => ({
  ...group.toJSON(),
  goals: group.goals.filter((goal) => {
    if (goal.goalTemplate && goal.goalTemplate.creationMethod === CREATION_METHOD.CURATED) {
      return allowClosedCuratedGoal || goal.status !== GOAL_STATUS.CLOSED;
    }
    return true;
  }).map((goal) => goal.id),
});

export async function getSimilarityGroupById(
  similarityGroupId: number,
  where : WhereOptions = {},
) {
  const group = await GoalSimilarityGroup.findOne({
    where: {
      ...where,
      id: similarityGroupId,
    },
    include: [
      {
        model: Goal,
        as: 'goals',
        attributes: ['id'],
      },
    ],
    attributes: similarityGroupAttributes,
  });

  if (!group) {
    return null;
  }

  return flattenSimilarityGroupGoals(group);
}

export async function getSimilarityGroupsContainingGoalId(goalId: number) {
  const groups = await GoalSimilarityGroup.findAll({
    attributes: similarityGroupAttributes,
    include: [
      {
        model: GoalSimilarityGroupGoal,
        as: 'goalSimilarityGroups',
        where: {
          goalId,
        },
        required: true,
      },
      {
        through: {
          attributes: [],
        },
        model: Goal,
        as: 'goals',
        attributes: ['id'],
      },
    ],
  });

  return groups.map(flattenSimilarityGroupGoals);
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
  allowClosedCuratedGoal = false,
) {
  const groups = await GoalSimilarityGroup.findAll({
    attributes: similarityGroupAttributes,
    where: {
      ...where,
      recipientId,
    },
    include: [{
      model: Goal,
      as: 'goals',
      attributes: ['id', 'goalTemplateId', 'status'],
      required: false,
      include: [{
        model: GoalTemplate,
        as: 'goalTemplate',
        attributes: ['creationMethod', 'id'],
        required: false,
      }],
    }],
  });

  return groups.map(
    (gg: SimilarityGroup) => flattenSimilarityGroupGoals(gg, allowClosedCuratedGoal),
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
  goals: number[],
) {
  // check for existing similarity group
  let group;

  if (goals && goals.length) {
    group = await getSimilarityGroupByContainingGoalIds(
      goals,
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
  }, { individualHooks: true });

  await GoalSimilarityGroupGoal.bulkCreate(
    goals.map((goalId) => ({
      goalId,
      goalSimilarityGroupId: newGroup.id,
    })),
    { individualHooks: true },
  );

  return getSimilarityGroupById(newGroup.id);
}
