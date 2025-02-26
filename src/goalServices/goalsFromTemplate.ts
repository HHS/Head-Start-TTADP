import { Op } from 'sequelize';
import { GOAL_STATUS } from '@ttahub/common';
import { uniq } from 'lodash';
import db from '../models';
import changeGoalStatus from './changeGoalStatus';

const {
  GoalTemplate,
  Goal,
} = db;

export default async function goalsFromTemplate(
  goalTemplateId: number,
  userId: number,
  data: {
    grants: number[],
    regionId: number,
  },
) {
  const template = await GoalTemplate.findOne({
    attributes: [
      'templateName',
      'source',
    ],
    where: {
      id: goalTemplateId,
    },
  }) as {
    templateName: string,
    source: string,
  };

  if (!template) {
    throw new Error(`Template with id ${goalTemplateId} not found`);
  }

  // Get all goals that match the templateId and grantId
  const goals = await Goal.findAll({
    attributes: ['id', 'status', 'grantId', 'goalTemplateId'],
    where: {
      [Op.or]: [
        {
          goalTemplateId,
          status: {
            [Op.not]: GOAL_STATUS.CLOSED,
          },
        },
      ],
      grantId: data.grants,
    },
  }) as {
    id: number,
    // eslint-disable-next-line max-len
    status: GOAL_STATUS.DRAFT | GOAL_STATUS.NOT_STARTED | GOAL_STATUS.IN_PROGRESS | GOAL_STATUS.SUSPENDED,
    grantId: number,
    goalTemplateId: number,
  }[];

  // unsuspend any suspended goals
  const suspendedGoals = goals.filter((goal) => goal.status === GOAL_STATUS.SUSPENDED);
  const unsuspends = suspendedGoals.map((goal) => changeGoalStatus({
    goalId: goal.id,
    userId,
    newStatus: GOAL_STATUS.IN_PROGRESS,
    reason: '',
    context: '',
  }));

  // find any grants that do not have a goal from template already
  const goalsWithTemplate = goals.map((goal) => goal.grantId);
  const missingGrants = data.grants.filter((grant) => !goalsWithTemplate.includes(grant));
  const newGoals = missingGrants.map((grant) => Goal.create({
    goalTemplateId,
    grantId: grant,
    status: GOAL_STATUS.NOT_STARTED,
    source: template.source,
    name: template.templateName,
    createdVia: 'rtr',
  }, {
    individualHooks: true,
    returning: ['id'],
  }));

  const resolved = await Promise.all([...unsuspends, ...newGoals]);

  return uniq([
    ...goals.map((goal) => goal.id),
    ...resolved.map((goal) => goal.id),
  ]);
}
