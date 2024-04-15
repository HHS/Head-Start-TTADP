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
  userId = 5,
  newStatus,
  reason,
  context,
  transaction = null,
}: GoalStatusChangeParams) {
  // If userId is null, and we're in CI or a Jest test, just set it to 5.
  // This let's us simplify the way we write the many tests that end up using this function
  // one way or another, since mocking httpContext is a pain.
  if (!userId && (process.env.NODE_ENV === 'test' || process.env.CI)) {
    // eslint-disable-next-line no-param-reassign
    userId = 5;
  }

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

  await goal.reload();

  return goal;
}
