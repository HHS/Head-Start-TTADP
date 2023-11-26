const { Op } = require('sequelize');

const httpContext = require('express-http-context'); // eslint-disable-line import/no-import-module-exports

/**
 * Finds the ID for a given collaborator type in the database.
 *
 * @param {Object} sequelize - The Sequelize instance.
 * @param {Object} transaction - The transaction object.
 * @param {string} typeName - The name of the collaborator type to find.
 * @returns {Promise<Object>} - A promise that resolves to the found collaborator type ID.
 */
const getIdForCollaboratorType = async (
  sequelize,
  transaction,
  typeName,
  // Find the collaborator type in the database
) => sequelize.models.CollaboratorType.findOne({
  where: {
    name: typeName,
  },
  include: [{
    model: sequelize.models.validFor,
    as: 'validFor',
    required: true,
    attributes: [],
    where: { name: 'Goals' },
  }],
  raw: true,
  transaction,
});

/**
 * Creates a new goal collaborator in the database.
 *
 * @param {Object} sequelize - The Sequelize instance.
 * @param {Object} transaction - The transaction object for atomicity.
 * @param {number} goalId - The ID of the goal.
 * @param {number} userId - The ID of the user.
 * @returns {Promise<Object>} - A Promise that resolves to the created goal collaborator.
 */
const createGoalCollaborator = async (
  sequelize,
  transaction,
  goalId,
  userId,
  typeName,
  linkBack = null,
) => {
  const { id: collaboratorTypeId } = await getIdForCollaboratorType(
    sequelize,
    transaction,
    typeName,
  );
  return sequelize.models.GoalCollaborator
    .create({
      goalId,
      userId,
      collaboratorTypeId,
      linkBack,
    }, { transaction });
};

/**
 * Retrieves a goal collaborator record from the database.
 *
 * @param {object} sequelize - The Sequelize instance.
 * @param {object} transaction - The transaction object.
 * @param {number} goalId - The ID of the goal.
 * @param {number} userId - The ID of the user.
 * @returns {Promise<object>} - A promise that resolves to the goal collaborator record.
 */
const getGoalCollaboratorRecord = async (
  sequelize,
  transaction,
  goalId,
  userId,
  typeName,
  // Find the goal collaborator record in the database
) => sequelize.models.GoalCollaborator.findOne({
  where: {
    goalId,
    userId,
  },
  include: [{
    model: sequelize.models.CollaboratorType,
    as: 'collaboratorType',
    required: true,
    where: { name: typeName },
    attributes: ['name'],
  }],
}, { transaction });

const mergeObjects = (obj1, obj2) => {
  if (obj1 === null && obj2 === null) return null;
  if (obj1 === null) return obj2;
  if (obj2 === null) return obj1;

  const mergedObj = { ...obj1 };

  Object.keys(obj2).forEach((key) => {
    if (!(key in obj1)) {
      mergedObj[key] = obj2[key];
    } else if (Array.isArray(obj1[key]) && Array.isArray(obj2[key])) {
      const combinedArray = [...new Set([...obj1[key], ...obj2[key]])];
      mergedObj[key] = combinedArray;
    }
  });

  return mergedObj;
};

/**
 * Finds or creates a goal collaborator record in the database.
 *
 * @param {Object} sequelize - The Sequelize instance.
 * @param {Object} transaction - The transaction object for database operations.
 * @param {number} goalId - The ID of the goal.
 * @param {number} userId - The ID of the user.
 * @returns {Promise<Object>} - The goal collaborator record.
 */
const findOrCreateGoalCollaborator = async (
  sequelize,
  transaction,
  goalId,
  userId,
  typeName,
  linkBack = null,
) => {
  // Check if a goal collaborator record already exists
  let collaborator = await getGoalCollaboratorRecord(
    sequelize,
    transaction,
    goalId,
    userId,
    typeName,
  );

  // If no collaborator record found, create a new one
  if (!collaborator) {
    collaborator = await createGoalCollaborator(
      sequelize,
      transaction,
      goalId,
      userId,
      typeName,
      linkBack,
    );
  } else {
    collaborator = await sequelize.models.GoalCollaborator.update(
      {
        linkBack: mergeObjects(collaborator.dataValues.linkBack, linkBack),
      },
      {
        where: { id: collaborator.dataValues.id },
        transaction,
        independentHooks: true,
        returning: true,
      },
    );
  }

  return collaborator;
};

/**
 * Populates the collaborator for a specific type of goal for the current user.
 *
 * @param {Object} sequelize - The Sequelize instance.
 * @param {Object} options - Additional options for the query.
 * @param {number} goalId - The ID of the goal.
 * @param {string} role - The typeName of the collaborator.
 * @returns {Promise} A promise that resolves to the result of populating the collaborator.
 */
const currentUserPopulateCollaboratorForType = async (
  sequelize,
  options,
  goalId,
  typeName,
  linkBack = null,
) => {
  // Get the ID of the currently logged in user
  const userId = httpContext.get('loggedUser');
  if (!userId && process.env.NODE_ENV !== 'production') return Promise.resolve();

  // Populate the collaborator for the specified type of goal using the current user's
  // ID and typeName
  return findOrCreateGoalCollaborator(
    sequelize,
    options,
    goalId,
    userId,
    typeName,
    linkBack,
  );
};

/**
 * Removes collaborators for a specific type and goal from the database.
 *
 * @param {Object} sequelize - The Sequelize instance.
 * @param {Object} options - The options object.
 * @param {number} goalId - The ID of the goal.
 * @param {string} typeName - The name of the collaborator type.
 * @param {Object} linkBack - The link back object.
 */
const removeCollaboratorsForType = async (
  sequelize,
  options,
  goalId,
  typeName,
  linkBack = undefined,
) => {
  if (!linkBack) return;
  let filteredLinkBack;
  if (Array.isArray(linkBack)) {
    filteredLinkBack = linkBack.filter((lb) => lb);
    if (filteredLinkBack.length === 0) return;
  } else {
    return;
  }

  // Extract the key-value pair from the linkBack object
  const [[linkBackKey, linkBackValues]] = Object.entries(filteredLinkBack);

  // Find all GoalCollaboratorType records that meet the specified criteria
  const currentCollaboratorsForType = await sequelize.models.GoalCollaborator.findAll({
    where: {
      goalId,
      linkBack: { [Op.overlap]: filteredLinkBack },
    },
    include: [
      {
        model: sequelize.models.CollaboratorType,
        as: 'collaboratorType',
        required: true,
        attributes: [],
        where: {
          name: typeName,
        },
        include: [{
          model: sequelize.models.ValidFor,
          as: 'validFor',
          required: true,
          attributes: [],
          where: { name: 'Goals' },
        }],
      },
    ],
    transaction: options.transaction,
  });

  if (currentCollaboratorsForType) {
    // Separate the updates and deletes based on the conditions
    const {
      updates,
      deletes,
    } = currentCollaboratorsForType.reduce((acc, current) => {
      if (current.dataValues.linkBack[linkBackKey].length > 1) {
        // Remove the specified linkBack values from the array
        const newLinkBack = {
          ...current.dataValues.linkBack,
          [linkBackKey]: current.dataValues.linkBack[linkBackKey]
            .filter((value) => !linkBackValues.includes(value)),
        };
        acc.updates.push({
          id: current.dataValues.id,
          linkBack: newLinkBack,
        });
      } else if (Object.keys(current.dataValues.linkBack).length > 1) {
        // Remove the specified linkBack key from the object
        const newLinkBack = current.dataValues.linkBack;
        delete newLinkBack[linkBackKey];
        acc.updates.push({
          id: current.dataValues.id,
          linkBack: newLinkBack,
        });
      } else {
        // Add the ID to the deletes array
        acc.deletes.push(current.dataValues.id);
      }
      return acc;
    }, { updates: [], deletes: [] });

    // Update the GoalCollaboratorType records and delete the specified records
    await Promise.all([
      ...(updates.length > 0
        ? updates.map(async (update) => sequelize.models.GoalCollaborator.update(
          { linkBack: update.linkBack },
          {
            where: { id: update.id },
            independentHooks: true,
            transaction: options.transaction,
          },
        ))
        : [Promise.resolve()]),
      (deletes.length > 0
        ? sequelize.models.GoalCollaborator.destroy({
          where: { id: deletes },
          independentHooks: true,
          transaction: options.transaction,
        })
        : Promise.resolve()),
    ]);
  }
};

export {
  createGoalCollaborator,
  getGoalCollaboratorRecord,
  findOrCreateGoalCollaborator,
  getIdForCollaboratorType,
  currentUserPopulateCollaboratorForType,
  removeCollaboratorsForType,
};
