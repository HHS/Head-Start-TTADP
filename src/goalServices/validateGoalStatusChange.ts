import { REPORT_STATUSES } from '@ttahub/common';
import { CONFLICT } from 'http-codes';
import { Op, type Transaction } from 'sequelize';
import { GOAL_STATUS, OBJECTIVE_STATUS } from '../constants';
import db from '../models';

export const GOAL_STATUS_CHANGE_BLOCKED = 'GOAL_STATUS_CHANGE_BLOCKED';
export const ACTIVE_REPORT_BLOCKER = 'ACTIVE_ACTIVITY_REPORT';
export const INCOMPLETE_OBJECTIVES_BLOCKER = 'INCOMPLETE_OBJECTIVES';

interface ValidationOptions {
  includeIncompleteObjectives?: boolean;
  treatApprovedArObjectivesAsComplete?: boolean;
  transaction?: Transaction;
}

export class GoalStatusChangeBlockedError extends Error {
  code: string;

  reasons: string[];

  responseBody: {
    code: string;
    reasons: string[];
  };

  statusCode: number;

  constructor(reasons: string[]) {
    super('Goal status change blocked');
    this.name = 'GoalStatusChangeBlockedError';
    this.code = GOAL_STATUS_CHANGE_BLOCKED;
    this.reasons = reasons;
    this.responseBody = {
      code: this.code,
      reasons: this.reasons,
    };
    this.statusCode = CONFLICT;
  }
}

export async function getGoalStatusChangeBlockingReasons(
  goalIds: number | number[],
  newStatus: string,
  {
    includeIncompleteObjectives = true,
    treatApprovedArObjectivesAsComplete = false,
    transaction,
  }: ValidationOptions = {}
) {
  if (newStatus !== GOAL_STATUS.CLOSED) {
    return [];
  }

  const ids = [goalIds].flat();
  const [activeReportGoal, incompleteObjective] = await Promise.all([
    db.ActivityReportGoal.findOne({
      attributes: ['goalId'],
      where: {
        goalId: {
          [Op.in]: ids,
        },
      },
      include: [
        {
          model: db.ActivityReport,
          as: 'activityReport',
          attributes: [],
          required: true,
          where: {
            calculatedStatus: {
              [Op.in]: [
                REPORT_STATUSES.DRAFT,
                REPORT_STATUSES.SUBMITTED,
                REPORT_STATUSES.NEEDS_ACTION,
              ],
            },
          },
        },
      ],
      transaction,
    }),
    includeIncompleteObjectives
      ? db.Objective.findOne({
          attributes: ['id'],
          where: {
            goalId: {
              [Op.in]: ids,
            },
            [Op.or]: [
              {
                status: {
                  [Op.ne]: OBJECTIVE_STATUS.COMPLETE,
                },
              },
              { status: null },
            ],
            ...(treatApprovedArObjectivesAsComplete && {
              [Op.and]: [
                {
                  [Op.or]: [{ onApprovedAR: false }, { onApprovedAR: null }],
                },
              ],
            }),
          },
          transaction,
        })
      : null,
  ]);

  const reasons = [];
  if (activeReportGoal) {
    reasons.push(ACTIVE_REPORT_BLOCKER);
  }
  if (incompleteObjective) {
    reasons.push(INCOMPLETE_OBJECTIVES_BLOCKER);
  }

  return reasons;
}

export async function validateGoalStatusChange(
  goalIds: number | number[],
  newStatus: string,
  options: ValidationOptions = {}
) {
  const reasons = await getGoalStatusChangeBlockingReasons(goalIds, newStatus, options);
  if (reasons.length) {
    throw new GoalStatusChangeBlockedError(reasons);
  }
}
