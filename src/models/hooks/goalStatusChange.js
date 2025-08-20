import { CLOSE_SUSPEND_REASONS, GOAL_STATUS } from '@ttahub/common';
import { OBJECTIVE_STATUS } from '../../constants';

const setPerformedAt = (instance) => {
  const { performedAt } = instance;

  if (!performedAt) {
    instance.set('performedAt', new Date());
  }
};

const updateGoalStatus = async (sequelize, instance) => {
  // Get the GoalStatusChange instance, and the current values of oldStatus and newStatus.
  const { oldStatus, newStatus } = instance;

  // If the status is not changing, do nothing.
  if (oldStatus === newStatus) {
    return;
  }

  const { Goal } = sequelize.models;
  const goal = await Goal.findByPk(instance.goalId);

  if (goal) {
    goal.status = newStatus;
    await goal.save();
  }
};

const updateObjectiveStatusIfSuspended = async (sequelize, instance) => {
  const { oldStatus, newStatus, reason } = instance;

  if (reason === 'Goal created' || oldStatus === newStatus || newStatus !== GOAL_STATUS.SUSPENDED) {
    return;
  }

  const { Objective } = sequelize.models;
  await Objective.update({
    status: OBJECTIVE_STATUS.SUSPENDED,
    closeSuspendReason: CLOSE_SUSPEND_REASONS.includes(instance.reason) ? instance.reason : null,
  }, {
    where: {
      goalId: instance.goalId,
      status: [
        OBJECTIVE_STATUS.NOT_STARTED,
        OBJECTIVE_STATUS.IN_PROGRESS,
      ],
    },
  });
};

const beforeCreate = async (sequelize, instance) => {
  setPerformedAt(instance);
};

const afterCreate = async (sequelize, instance, options) => {
  await updateGoalStatus(sequelize, instance);
  await updateObjectiveStatusIfSuspended(sequelize, instance);
};

export {
  afterCreate,
  beforeCreate,
};
