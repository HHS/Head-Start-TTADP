import * as Sequelize from 'sequelize';
import db from '../models';

interface GoalStatusChangeParams {
  goalId: number;
  userId: number; // Always required, unless it's a system change.
  newStatus: string;
  reason: string;
  context: string;
  transaction?: Sequelize.Transaction;
  oldStatusToUse?: string | null;
}

export default async function changeGoalStatus({
  goalId,
  userId = null,
  newStatus,
  reason,
  context,
}: GoalStatusChangeParams) {
  const [user, goal] = await Promise.all([
    userId
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
      : null,
    db.Goal.findByPk(goalId),
  ]);

  if (!goal) {
    throw new Error('Goal not found');
  }

  const oldStatus = goal.status;
  await db.GoalStatusChange.create({
    goalId,
    userId: !user ? null : user.id,
    userName: !user ? 'system' : user.name,
    userRoles: !user ? null : user.roles.map((role) => role.name),
    oldStatus,
    newStatus,
    reason,
    context,
  });

  await goal.reload();

  return goal;
}
