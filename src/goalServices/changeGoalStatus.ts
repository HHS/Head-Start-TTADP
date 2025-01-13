import * as Sequelize from 'sequelize';
import db from '../models';

interface GoalStatusChangeParams {
  goalId: number;
  userId: number; // Always required
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
}: GoalStatusChangeParams) {
  const [user, goal] = await Promise.all([
    userId !== -1
      ? db.User.findOne({
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
      })
      : null, // Skip user lookup if userId is -1
    db.Goal.findByPk(goalId),
  ]);

  if (!goal) {
    throw new Error('Goal not found');
  }

  if (!user && userId !== -1) {
    throw new Error('User not found');
  }

  const oldStatus = goal.status;

  await db.GoalStatusChange.create({
    goalId,
    userId: userId === -1 ? null : user.id, // Use null for -1, otherwise the user's ID
    userName: userId === -1 ? 'system' : user.name, // Use "system" for -1, otherwise the user's name
    // eslint-disable-next-line max-len
    userRoles: userId === -1 ? null : user.roles.map((role) => role.name), // Use null for -1, otherwise the user's roles
    oldStatus,
    newStatus,
    reason,
    context,
  });

  await goal.reload();

  return goal;
}
