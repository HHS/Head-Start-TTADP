import { Op, WhereOptions } from 'sequelize';
import db from '../models';

const { GoalSimilarityGroup } = db;

const similarityGroupAttributes = ['id', 'recipientId', 'goals', 'userHasInvalidated', 'finalGoalId'];

export async function getSimilarityGroupById(
  similarityGroupId: number,
  where : WhereOptions = {},
) {
  return GoalSimilarityGroup.findOne({
    where: {
      ...where,
      id: similarityGroupId,

    },
    attributes: similarityGroupAttributes,
  });
}

export async function getSimilarityGroupsContainingGoalId(goalId: number) {
  return GoalSimilarityGroup.findAll({
    where: {
      goals: {
        [Op.contains]: [goalId],
      },
    },
    attributes: similarityGroupAttributes,
  });
}

export async function getSimilarityGroupByContainingGoalIds(
  goalIds: number[],
  where: WhereOptions = {},
) {
  return GoalSimilarityGroup.findOne({
    attributes: similarityGroupAttributes,
    where: {
      goals: {
        [Op.contains]: goalIds,
      },
    },
    ...where,
  });
}

export async function createSimilarityGroup(recipientId: number, goals: number[]) {
  // check for existing similarity group

  const group = await getSimilarityGroupByContainingGoalIds(
    goals,
    { recipientId },
  );

  if (group) {
    return group;
  }

  return GoalSimilarityGroup.create({
    recipientId,
    goals,
  });
}

export async function getSimilarityGroupsByRecipientId(
  recipientId: number,
  where: WhereOptions = {},
) {
  return GoalSimilarityGroup.findAll({
    attributes: similarityGroupAttributes,
    where: {
      recipientId,
      ...where,
    },
  });
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
  goalsMerged: number[],
) {
  return GoalSimilarityGroup.update(
    {
      finalGoalId,
      goalsMerged,
    },
    {
      where: {
        id,
      },
    },
  );
}

export async function deleteSimilarityGroup(similarityGroupId: number) {
  return GoalSimilarityGroup.destroy({
    where: {
      id: similarityGroupId,
    },
  });
}
