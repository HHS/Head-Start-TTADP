import { Op } from 'sequelize';
import {
  sequelize, Goal, GoalTemplate, Grant,
} from '../models';
import { auditLogger } from '../logger';

const SOURCE = 'Federal monitoring issues, including CLASS and RANs';
const DEFAULT_STATUS = 'Not Started';

export default async function addMonitoringGoalForGrant(
  grantId,
  transaction = null,
) {
  if (!grantId) {
    throw new Error('grantId is required');
  }

  const grant = await Grant.findByPk(grantId, {
    attributes: ['id'],
    transaction,
  });
  if (!grant) {
    throw new Error(`Grant not found for id ${grantId}`);
  }

  const monitoringGoalTemplate = await GoalTemplate.findOne({
    where: {
      standard: 'Monitoring',
      deletedAt: null,
    },
    order: [['id', 'DESC']],
    transaction,
  });

  if (!monitoringGoalTemplate) {
    throw new Error('Monitoring Goal template not found');
  }

  const run = async (t) => {
    const existingOpen = await Goal.findOne({
      where: {
        grantId,
        goalTemplateId: monitoringGoalTemplate.id,
        status: { [Op.ne]: 'Closed' },
        deletedAt: null,
      },
      transaction: t,
    });

    if (existingOpen) {
      auditLogger.info(
        `Monitoring goal already open for grant ${grantId} (goalId=${existingOpen.id})`,
      );
      return existingOpen.id;
    }

    const goal = await Goal.create(
      {
        name: monitoringGoalTemplate.templateName,
        status: DEFAULT_STATUS,
        timeframe: null,
        isFromSmartsheetTtaPlan: false,
        goalTemplateId: monitoringGoalTemplate.id,
        grantId,
        onApprovedAR: false,
        createdVia: 'monitoring',
        isRttapa: 'Yes',
        onAR: false,
        source: SOURCE,
      },
      {
        transaction: t,
        userId: null,
        ignoreHooks: ['autoPopulateCreator'],
      },
    );

    auditLogger.info(`Created monitoring goal ${goal.id} for grant ${grantId}`);
    return goal.id;
  };

  if (transaction) {
    return run(transaction);
  }

  return sequelize.transaction(async (t) => run(t));
}
