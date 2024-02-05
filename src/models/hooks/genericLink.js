import Semaphore from '../../lib/semaphore';

const semaphore = new Semaphore(1);

/**
 * Synchronizes a link between an instance and a model entity within a transaction, ensuring that
 * a new record is created if one does not already exist for the given entity ID.
 *
 * @param {Sequelize} sequelize - The Sequelize instance to be used for the transaction.
 * @param {Object} instance - The instance that is being linked.
 * @param {Object} options - An object containing transaction details.
 * @param {Model} model - The Sequelize model that is being linked to.
 * @param {string} entityName - The name of the entity field in the model.
 * @param {number|string} entityId - The ID of the entity to link to.
 * @param {Function} onCreateCallbackWhileHoldingLock - A callback function to be called after
 * creating a new record, while still holding the semaphore lock.
 *
 * @returns {Promise<void>} A promise that resolves when the operation is complete.
 *
 * @throws {Error} Throws an error if acquiring the semaphore lock fails or if any database
 * operation fails.
 */
const syncLink = async (
  sequelize,
  instance,
  options,
  model,
  entityName,
  entityId,
  onCreateCallbackWhileHoldingLock,
) => {
  if (!entityId || entityId.toString().length === 0) return;

  if (!instance.isNewRecord) {
    const changed = Array.from(instance.changed());

    if (!changed.includes(entityName)) return;
  }
  // Generate a unique semaphore key based on the model name and entity ID
  const semaphoreKey = `${model.tableName}_${entityId}`;
  // Acquire a lock to ensure only one operation is performed on this entity at a time
  await semaphore.acquire(semaphoreKey);

  // Check if there's an existing record for the given entity ID
  const [currentRecord] = await model.findAll({
    attsributes: [entityName],
    where: { [entityName]: entityId },
    transaction: options.transactions,
  });

  // If no current record exists, create a new one
  if (!currentRecord) {
    const newRecord = await model.create({
      [entityName]: entityId,
    }, {
      transaction: options.transactions,
    });
    // If a callback is provided, call it while the lock is still held
    if (onCreateCallbackWhileHoldingLock) {
      await onCreateCallbackWhileHoldingLock(
        sequelize,
        instance,
        options,
        model,
        entityName,
        entityId,
      );
    }
  }

  // Release the lock after the operation is complete
  semaphore.release(semaphoreKey);
};

/**
 * Links a grant to an entity by updating the entity's grantId with the ID of the grant
 * found by grantNumber.
 *
 * @param {Object} sequelize - An instance of Sequelize used for database transactions.
 * @param {Object} instance - The instance of the entity to which the grant is being linked.
 * @param {Object} options - An object containing transaction details.
 * @param {Object} model - The model representing the entity to be updated with the grantId.
 * @param {string} entityName - The name of the entity being updated.
 * @param {string} grantNumber - The grant number used to find the grant in the database.
 *
 * @returns {Promise<void>} A promise that resolves when the operation is complete.
 *
 * @throws Will throw an error if the database operations fail.
 */
const linkGrant = async (
  sequelize,
  instance,
  options,
  model,
  entityName,
  grantNumber,
) => {
  // Find the grant in the database using the provided grant number.
  const grant = await sequelize.models.Grant.findOne({
    attributes: [['id', 'grantId']], // Select only the 'id' column and alias it as 'grantId'.
    where: { number: grantNumber }, // Filter the grants by the provided grant number.
    transaction: options.transactions, // Use the transaction provided in the options if any.
  });

  // If a grant is found, proceed to update the relevant model.
  if (grant) {
    // Update the model with the grantId where the entity matches the grant number.
    await model.update(
      { grantId: grant.grantId }, // Set the grantId in the model to the found grant's ID.
      {
        [entityName]: grantNumber, // Use the entity name as a key to match the grant number.
        transaction: options.transactions, // Use the transaction provided in the options if any.
        individualHooks: true, // Enable individual hooks for the update operation.
      },
    );
  }
};

/**
 * Asynchronously synchronizes a grant number link with the associated GrantNumberLink model.
 * This function delegates to the `syncLink` function with specific parameters.
 *
 * @param {Object} sequelize - An instance of Sequelize.
 * @param {Object} instance - The Sequelize model instance to sync.
 * @param {Object} options - The options object to pass to the `syncLink` function.
 * @returns {Promise} A promise that resolves when the link synchronization is complete.
 * @throws {Error} Throws an error if the `syncLink` function encounters an issue.
 */
const syncGrantNumberLink = async (sequelize, instance, options, columnName = 'grantNumber') => syncLink(
  sequelize,
  instance,
  options,
  sequelize.models.GrantNumberLink,
  columnName,
  instance[columnName],
  linkGrant,
);

/**
 * Synchronizes the MonitoringReviewLink for a given instance.
 *
 * @param {Object} sequelize - The Sequelize instance to be used for the operation.
 * @param {Object} instance - The instance for which the MonitoringReviewLink should be synchronized
 * @param {Object} options - Additional options for the synchronization process.
 * @returns {Promise<Object>} A promise that resolves with the result of the syncLink operation.
 *
 * @throws {Error} Throws an error if the syncLink operation fails.
 */
const syncMonitoringReviewLink = async (
  sequelize,
  instance,
  options,
) => syncLink(
  sequelize,
  instance,
  options,
  sequelize.models.MonitoringReviewLink,
  'reviewId',
  instance.reviewId,
);

/**
 * Asynchronously synchronizes the monitoring review status link for a given instance.
 *
 * @param {Object} sequelize - The Sequelize instance to be used for the operation.
 * @param {Object} instance - The instance for which the monitoring review status link is being
 * synchronized.
 * @param {Object} options - Additional options for the synchronization process.
 * @returns {Promise} A promise that resolves when the synchronization is complete.
 * @throws {Error} Throws an error if the synchronization fails.
 */
const syncMonitoringReviewStatusLink = async (
  sequelize,
  instance,
  options,
) => syncLink(
  sequelize,
  instance,
  options,
  sequelize.models.MonitoringReviewStatusLink,
  'statusId',
  instance.statusId,
);

export {
  syncLink,
  syncGrantNumberLink,
  syncMonitoringReviewLink,
  syncMonitoringReviewStatusLink,
};
