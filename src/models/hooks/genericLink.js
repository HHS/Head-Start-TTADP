import { UniqueConstraintError } from 'sequelize';

/**
 * Synchronizes a link between an instance and a model entity within a transaction, ensuring that
 * a new record is created if one does not already exist for the given entity ID.
 *
 * The target column of every "*Link" model is a primary key or otherwise unique, so this relies
 * on the database to enforce "one link row per target entity" instead of an in-process lock:
 * concurrent creates for the same entityId race safely because at most one insert can succeed,
 * and the loser(s) simply treat the resulting unique-constraint violation as "already linked".
 *
 * @param {Sequelize} sequelize - The Sequelize instance to be used for the transaction.
 * @param {Object} instance - The instance that is being linked.
 * @param {Object} options - An object containing transaction details.
 * @param {Model} model - The Sequelize model that is being linked to.
 * @param {string} sourceEntityName - The name of the entity field in the model.
 * @param {string} targetEntityName - The name of the entity field in the model.
 * @param {number|string} entityId - The ID of the entity to link to.
 * @param {Function} onCreateCallbackWhileHoldingLock - A callback function invoked only when this
 * call is the one that actually inserts the new record (never when it loses a create race).
 *
 * @returns {Promise<void>} A promise that resolves when the operation is complete.
 *
 * @throws {Error} Throws an error if any database operation fails.
 */
const syncLink = async (
  sequelize,
  instance,
  options,
  model,
  sourceEntityName,
  targetEntityName,
  entityId,
  onCreateCallbackWhileHoldingLock
) => {
  if (!entityId || entityId.toString().length === 0) return;

  if (!instance.isNewRecord) {
    const changed = Array.from(instance.changed());

    if (!changed.includes(sourceEntityName)) return;
  }

  // Check if there's an existing record for the given entity ID
  const [currentRecord] = await model.findAll({
    attributes: [targetEntityName],
    where: { [targetEntityName]: entityId },
    transaction: options.transaction,
  });

  if (currentRecord) return;

  let created = false;
  try {
    await model.create(
      {
        [targetEntityName]: entityId,
      },
      {
        transaction: options.transaction,
      }
    );
    created = true;
  } catch (error) {
    // Another concurrent transaction/process already created the link row for this entityId.
    if (!(error instanceof UniqueConstraintError)) throw error;
  }

  // Only the request that actually won the create race should trigger side effects.
  if (created && onCreateCallbackWhileHoldingLock) {
    await onCreateCallbackWhileHoldingLock(
      sequelize,
      instance,
      options,
      model,
      targetEntityName,
      entityId
    );
  }
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
const linkGrant = async (sequelize, instance, options, model, entityName, grantNumber) => {
  // Find the grant in the database using the provided grant number.
  const grant = await sequelize.models.Grant.findOne({
    attributes: [['id', 'grantId']], // Select only the 'id' column and alias it as 'grantId'.
    where: { number: grantNumber }, // Filter the grants by the provided grant number.
    transaction: options.transaction, // Use the transaction provided in the options if any.
    raw: true,
  });

  // If a grant is found, proceed to update the relevant model.
  if (grant) {
    // Update the model with the grantId where the entity matches the grant number.
    await model.update(
      { grantId: grant.grantId }, // Set the grantId in the model to the found grant's ID.
      {
        where: {
          [entityName]: grantNumber, // Use the entity name as a key to match the grant number.
        },
        transaction: options.transaction, // Use the transaction provided in the options if any.
        individualHooks: true, // Enable individual hooks for the update operation.
      }
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
const syncGrantNumberLink = async (
  sequelize,
  instance,
  options,
  sourceColumnName = 'grantNumber',
  targetColumnName = 'grantNumber'
) =>
  syncLink(
    sequelize,
    instance,
    options,
    sequelize.models.GrantNumberLink,
    sourceColumnName,
    targetColumnName,
    instance[sourceColumnName],
    linkGrant
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
const syncMonitoringReviewLink = async (sequelize, instance, options) =>
  syncLink(
    sequelize,
    instance,
    options,
    sequelize.models.MonitoringReviewLink,
    'reviewId',
    'reviewId',
    instance.reviewId
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
const syncMonitoringReviewStatusLink = async (sequelize, instance, options) =>
  syncLink(
    sequelize,
    instance,
    options,
    sequelize.models.MonitoringReviewStatusLink,
    'statusId',
    'statusId',
    instance.statusId
  );

/**
 * Asynchronously synchronizes the monitoring finding status link for a given instance.
 *
 * @param {Object} sequelize - The Sequelize instance to be used for the operation.
 * @param {Object} instance - The instance for which the monitoring finding status link is being
 * synchronized.
 * @param {Object} options - Additional options for the synchronization process.
 * @returns {Promise} A promise that resolves when the synchronization is complete.
 * @throws {Error} Throws an error if the synchronization fails.
 */
const syncMonitoringFindingStatusLink = async (sequelize, instance, options) =>
  syncLink(
    sequelize,
    instance,
    options,
    sequelize.models.MonitoringFindingStatusLink,
    'statusId',
    'statusId',
    instance.statusId
  );

/**
 * Asynchronously synchronizes the monitoring finding history status link for a given instance.
 *
 * @param {Object} sequelize - The Sequelize instance to be used for the operation.
 * @param {Object} instance - The instance for which the monitoring finding history status link
 * is being synchronized.
 * @param {Object} options - Additional options for the synchronization process.
 * @returns {Promise} A promise that resolves when the synchronization is complete.
 * @throws {Error} Throws an error if the synchronization fails.
 */
const syncMonitoringFindingHistoryStatusLink = async (sequelize, instance, options) =>
  syncLink(
    sequelize,
    instance,
    options,
    sequelize.models.MonitoringFindingHistoryStatusLink,
    'statusId',
    'statusId',
    instance.statusId
  );

/**
 * Asynchronously synchronizes the monitoring standard link for a given instance.
 *
 * @param {Object} sequelize - The Sequelize instance to be used for the operation.
 * @param {Object} instance - The instance for which the monitoring standard link is being
 * synchronized.
 * @param {Object} options - Additional options for the synchronization process.
 * @returns {Promise} A promise that resolves when the synchronization is complete.
 * @throws {Error} Throws an error if the synchronization fails.
 */
const syncMonitoringStandardLink = async (sequelize, instance, options) =>
  syncLink(
    sequelize,
    instance,
    options,
    sequelize.models.MonitoringStandardLink,
    'standardId',
    'standardId',
    instance.standardId
  );

/**
 * Asynchronously synchronizes the monitoring finding grantee link for a given instance.
 *
 * @param {Object} sequelize - The Sequelize instance to be used for the operation.
 * @param {Object} instance - The instance for which the monitoring finding grantee link is being
 * synchronized.
 * @param {Object} options - Additional options for the synchronization process.
 * @returns {Promise} A promise that resolves when the synchronization is complete.
 * @throws {Error} Throws an error if the synchronization fails.
 */
const syncMonitoringGranteeLink = async (sequelize, instance, options) =>
  syncLink(
    sequelize,
    instance,
    options,
    sequelize.models.MonitoringGranteeLink,
    'granteeId',
    'granteeId',
    instance.granteeId
  );

/**
 * Asynchronously synchronizes the monitoring finding link for a given instance.
 *
 * @param {Object} sequelize - The Sequelize instance to be used for the operation.
 * @param {Object} instance - The instance for which the monitoring finding link is being
 * synchronized.
 * @param {Object} options - Additional options for the synchronization process.
 * @returns {Promise} A promise that resolves when the synchronization is complete.
 * @throws {Error} Throws an error if the synchronization fails.
 */
const syncMonitoringFindingLink = async (sequelize, instance, options) =>
  syncLink(
    sequelize,
    instance,
    options,
    sequelize.models.MonitoringFindingLink,
    'findingId',
    'findingId',
    instance.findingId
  );

/**
 * Asynchronously clears the grant number link for a given grantee instance.
 *
 * @param {Object} sequelize - The Sequelize instance to be used for the operation.
 * @param {Object} instance - The grantee instance whose grant number link is being cleared.
 * @param {Object} options - Additional options for the clearing process.
 * @returns {Promise} A promise that resolves when the clearing is complete.
 * @throws {Error} Throws an error if the clearing fails.
 */
const clearGrantNumberLink = async (sequelize, instance, options) =>
  sequelize.models.GrantNumberLink.update(
    { grantId: null },
    {
      where: { grantId: instance.id },
      transaction: options.transaction,
    }
  );

export {
  clearGrantNumberLink,
  syncGrantNumberLink,
  syncLink,
  syncMonitoringFindingHistoryStatusLink,
  syncMonitoringFindingLink,
  syncMonitoringFindingStatusLink,
  syncMonitoringGranteeLink,
  syncMonitoringReviewLink,
  syncMonitoringReviewStatusLink,
  syncMonitoringStandardLink,
};
