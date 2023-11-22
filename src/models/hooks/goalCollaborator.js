/**
 * Synchronizes the roles between GoalCollaboratorRole and UserRole models.
 * @param {Object} sequelize - The Sequelize instance.
 * @param {Object} instance - The instance of GoalCollaborator model.
 * @param {Object} options - Additional options for the transaction.
 * @returns {Promise} A promise that resolves when the role synchronization is complete.
 */
const syncRoles = async (sequelize, instance, options) => {
  const { id: goalCollaboratorId, userId } = instance;

  // Retrieve the current roles associated with the goal collaborator
  // and the roles associated with the user
  const [
    currentRoles,
    usersRoles,
  ] = await Promise.all([
    sequelize.models.GoalCollaboratorRole.findAll({
      where: {
        goalCollaboratorId,
      },
    }),
    sequelize.models.UserRole.findAll({
      where: {
        userId,
      },
    }),
  ]);

  // Determine the roles that need to be inserted and deleted
  const [
    inserts,
    deletes,
  ] = [
    usersRoles
      .filter(({ roleId }) => !currentRoles
        .includes((currentRole) => currentRole.roleId === roleId))
      .map(({ roleId }) => ({
        goalCollaboratorId,
        roleId,
      })),
    currentRoles
      .filter(({ roleId }) => !usersRoles
        .includes((currentRole) => currentRole.roleId === roleId))
      .map(({ id, roleId }) => ({
        id,
        goalCollaboratorId,
        roleId,
      })),
  ];

  // Perform the necessary bulk updates and deletions in the GoalCollaboratorRole model
  return Promise.all([
    (inserts.length > 0
      ? sequelize.models.GoalCollaboratorRole.bulkUpdate(
        inserts,
        {
          transaction: options.transaction,
          individualHooks: true,
        },
      )
      : Promise.resolve()),
    (deletes.length > 0
      ? sequelize.models.GoalCollaboratorRole.destroy(
        { where: { id: deletes.map(({ id }) => id) } },
        {
          transaction: options.transaction,
          individualHooks: true,
        },
      )
      : Promise.resolve()),
  ]);
};

/**
 * Deletes the roles associated with a goal collaborator.
 * @param {Object} sequelize - The Sequelize instance.
 * @param {Object} instance - The instance of GoalCollaborator model.
 * @param {Object} options - Additional options for the transaction.
 * @returns {Promise} A promise that resolves when the role deletion is complete.
 */
const deleteRoles = async (sequelize, instance, options) => {
  const { id: goalCollaboratorId } = instance;

  // Delete the roles associated with the goal collaborator
  return sequelize.models.GoalCollaboratorRole.destroy(
    { where: { goalCollaboratorId } },
    {
      transaction: options.transaction,
      individualHooks: true,
    },
  );
};

/**
 * Performs role synchronization after creating a new goal collaborator.
 * @param {Object} sequelize - The Sequelize instance.
 * @param {Object} instance - The instance of GoalCollaborator model.
 * @param {Object} options - Additional options for the transaction.
 * @returns {Promise} A promise that resolves when the role synchronization is complete.
 */
const afterCreate = async (sequelize, instance, options) => {
  await syncRoles(sequelize, instance, options);
};

/**
 * Performs role synchronization after updating a goal collaborator.
 * @param {Object} sequelize - The Sequelize instance.
 * @param {Object} instance - The instance of GoalCollaborator model.
 * @param {Object} options - Additional options for the transaction.
 * @returns {Promise} A promise that resolves when the role synchronization is complete.
 */
const afterUpdate = async (sequelize, instance, options) => {
  await syncRoles(sequelize, instance, options);
};

/**
* Performs role deletion before deleting a goal collaborator.
* @param {Object} sequelize - The Sequelize instance.
* @param {Object} instance - The instance of GoalCollaborator model.
* @param {Object} options - Additional options for the transaction.
* @returns {Promise} A promise that resolves when the role deletion is complete.
*/
const beforeDestroy = async (sequelize, instance, options) => {
  await deleteRoles(sequelize, instance, options);
};

export {
  syncRoles,
  deleteRoles,
  afterCreate,
  afterUpdate,
  beforeDestroy,
};
