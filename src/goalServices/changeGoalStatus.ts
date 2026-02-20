import { parseISO } from 'date-fns';
import * as Sequelize from 'sequelize';
import db from '../models';

interface GoalStatusChangeParams {
  goalId: number;
  userId: number;
  newStatus: string;
  reason: string;
  context: string;
  performedAt?: string,
  forceStatusChange?: boolean;
  transaction?: Sequelize.Transaction;
}

export async function changeGoalStatusWithSystemUser({
  goalId,
  newStatus,
  reason,
  context,
}: GoalStatusChangeParams) {
  // Lookup goal.
  const goal = await db.Goal.findByPk(goalId);

  // Error if goal not found.
  if (!goal) {
    throw new Error('Goal not found');
  }

  // Only create status change if status is actually changing
  if (goal.status !== newStatus) {
    await db.GoalStatusChange.create({
      goalId: goal.id,
      userId: null, // For now we will use null to prevent FK constraint violation.
      userName: 'system',
      userRoles: null,
      oldStatus: goal.status,
      newStatus,
      reason,
      context,
      performedAt: null,
    });

    await goal.reload();
  }

  return goal;
}

export default async function changeGoalStatus({
  goalId,
  userId = 1,
  newStatus,
  reason,
  context,
  performedAt,
  forceStatusChange = false,
}: GoalStatusChangeParams) {
  const [user, goal] = await Promise.all([
    db.User.findOne({
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
    }),
    db.Goal.findByPk(goalId),
  ]);

  if (!goal || !user) {
    throw new Error('Goal or user not found');
  }

  const oldStatus = goal.status;

  const change = {
    goalId,
    userId,
    userName: user.name,
    userRoles: user.roles.map((role: { name: string }) => role.name),
    oldStatus,
    newStatus,
    reason,
    context,
    performedAt: performedAt ? parseISO(performedAt) : new Date(),
  };

  if (oldStatus !== newStatus || forceStatusChange) {
    await db.GoalStatusChange.create(change);
    await goal.reload();
  }

  return goal;
}
