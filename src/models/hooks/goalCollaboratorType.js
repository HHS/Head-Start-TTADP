/**
 * Removes the goal collaborator if there are no other types associated with it.
 * @param {Object} sequelize - The Sequelize instance.
 * @param {Object} instance - The instance of GoalCollaborator being destroyed.
 * @param {Object} options - The options object containing the transaction.
 */
const removeCollaboratorOnEmptyTypes = async (sequelize, instance, options) => {
  // Find all other types associated with the goal collaborator
  const otherTypes = sequelize.models.GoalCollaboratorType.findAll({
    where: { goalCollaboratorId: instance.goalCollaboratorId },
    attributes: [],
    transaction: options.transaction,
  });

  // Check if there are no other types
  if (!otherTypes) {
    // If there are no other types, destroy the goal collaborator
    await sequelize.models.GoalCollaborator.destroy({
      where: { id: instance.goalCollaboratorId },
      transaction: options.transaction,
    });
  }
};

/**
 * Function to be executed after a GoalCollaborator instance is destroyed.
 * Calls the removeCollaboratorOnEmptyTypes function.
 * @param {Object} sequelize - The Sequelize instance.
 * @param {Object} instance - The instance of GoalCollaborator being destroyed.
 * @param {Object} options - The options object containing the transaction.
 */
const afterDestroy = async (sequelize, instance, options) => {
  await removeCollaboratorOnEmptyTypes(sequelize, instance, options);
};

export {
  removeCollaboratorOnEmptyTypes,
  afterDestroy,
};