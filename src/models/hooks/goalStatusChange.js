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

const beforeCreate = async (sequelize, instance) => {
  setPerformedAt(instance);
};

const afterCreate = async (sequelize, instance, options) => {
  await updateGoalStatus(sequelize, instance);
};

export {
  afterCreate,
  beforeCreate,
};
