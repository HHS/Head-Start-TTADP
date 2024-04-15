import * as Sequelize from 'sequelize';
import db from '../models';

interface GoalStatusChangeParams {
  goalId: number;
  userId: number;
  newStatus: string;
  reason: string;
  context: string;
  transaction?: Sequelize.Transaction;
}

export default async function changeGoalStatus({
  goalId,
  userId,
  newStatus,
  reason,
  context,
  transaction = null,
}: GoalStatusChangeParams) {
  const user = await db.User.findOne({
    where: { id: userId },
    attributes: ['id', 'name'],
    include: [
      {
        model: db.Role,
        as: 'roles',
        attributes: ['name'],
        through: {
          attributes: [],
        },
      },
    ],
    ...(transaction ? { transaction } : {}),
  });

  const goal = await db.Goal.findByPk(goalId);

  if (!goal || !user) {
    throw new Error('Goal or user not found');
  }

  const oldStatus = goal.status;

  await db.GoalStatusChange.create({
    goalId,
    userId,
    userName: user.name,
    userRoles: user.roles.map((role) => role.name),
    oldStatus,
    newStatus,
    reason,
    context,
  });

  return goal;
}
