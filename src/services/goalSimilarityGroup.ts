import { Op, WhereOptions } from 'sequelize';
import db from '../models';

const { GoalSimilarityGroup, GoalSimilarityGroupGoal, Goal } = db;

const similarityGroupAttributes = ['id', 'recipientId', 'userHasInvalidated', 'finalGoalId'];

interface SimilarityGroup {
  id: number;
  recipientId: number;
  userHasInvalidated: boolean;
  finalGoalId: number;
  goals: { id: number }[];
  toJSON: () => SimilarityGroup;
}

const flattenSimilarityGroupGoals = (group: SimilarityGroup) => ({
  ...group.toJSON(),
  goals: group.goals.map((goal) => goal.id),
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
    where: {
      id: {
        [Op.in]: db.sequelize.literal(
          `(
            SELECT gsgg."goalSimilarityGroupId"
            FROM "GoalSimilarityGroupGoals" gsgg
            WHERE gsgg."goalId" = ${goalId}
            GROUP BY gsgg."goalSimilarityGroupId"
          )`,
        ),
      },
    },
    attributes: similarityGroupAttributes,
    include: [
      {
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
) {
  const groups = await GoalSimilarityGroup.findAll({
    attributes: similarityGroupAttributes,
    where: {
      ...where,
      recipientId,
    },
    include: [
      {
        model: Goal,
        as: 'goals',
        attributes: ['id'],
        required: false,
      },
    ],
  });

  return groups.map(flattenSimilarityGroupGoals);
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
    },
  );
}

export async function deleteSimilarityGroup(similarityGroupId: number) {
  await GoalSimilarityGroupGoal.destroy({
    where: {
      goalSimilarityGroupId: similarityGroupId,
    },
  });

  return GoalSimilarityGroup.destroy({
    where: {
      id: similarityGroupId,
    },
  });
}

export async function createSimilarityGroup(recipientId: number, goals: number[]) {
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
  });

  await GoalSimilarityGroupGoal.bulkCreate(
    goals.map((goalId) => ({
      goalId,
      goalSimilarityGroupId: newGroup.id,
    })),
  );

  return getSimilarityGroupById(newGroup.id);
}
