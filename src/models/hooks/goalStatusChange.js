/* eslint-disable import/prefer-default-export */
const afterCreate = async (sequelize, instance, options) => {
  // Get the GoalStatusChange instance, and the current values of oldStatus and newStatus.
  const { oldStatus, newStatus } = instance;

  // If the status is not changing, do nothing.
  if (oldStatus === newStatus) {
    return;
  }

  // Get the Goal instance.
  const { Goal } = sequelize.models;
  const goal = await Goal.findByPk(instance.goalId);

  // Update the goal's status.
  goal.status = newStatus;
  await goal.save();
};

export {
  afterCreate,
};
