import { Op } from 'sequelize';
import httpContext from 'express-http-context';
import Semaphore from '../../lib/semaphore';
import { GOAL_COLLABORATORS, OBJECTIVE_COLLABORATORS, GROUP_COLLABORATORS } from '../../constants';

const semaphore = new Semaphore(1);

const collaboratorDetails = {
  goal: {
    idName: 'goalId',
    validFor: 'Goals',
    collaborators: 'GoalCollaborator',
    creator: GOAL_COLLABORATORS.CREATOR,
    editor: GOAL_COLLABORATORS.EDITOR,
  },
  objective: {
    idName: 'objectiveId',
    validFor: 'Objectives',
    collaborators: 'ObjectiveCollaborator',
    creator: OBJECTIVE_COLLABORATORS.CREATOR,
    editor: OBJECTIVE_COLLABORATORS.EDITOR,
  },
  group: {
    idName: 'groupId',
    validFor: 'Groups',
    collaborators: 'GroupCollaborator',
    creator: GROUP_COLLABORATORS.CREATOR,
    editor: GROUP_COLLABORATORS.EDITOR,
  },
};

/**
 * Finds the ID for a given collaborator type in the database.
 *
 * @param {string} genericCollaboratorType - entity type for collaborator.
 * @param {Object} sequelize - The Sequelize instance.
 * @param {Object} transaction - The transaction object.
 * @param {string} typeName - The name of the collaborator type.
 * @returns {Promise<Object>} - A promise that resolves to the found collaborator type ID.
 */
const getIdForCollaboratorType = async (
  genericCollaboratorType,
  sequelize,
  transaction,
  typeName,
  // Find the collaborator type in the database
) => sequelize.models.CollaboratorType.findOne({
  where: {
    name: typeName,
  },
  include: [{
    model: sequelize.models.ValidFor,
    as: 'validFor',
    required: true,
    attributes: [],
    where: { name: collaboratorDetails[genericCollaboratorType].validFor },
  }],
  raw: true,
  ...(transaction && { transaction }),
});

/**
 * Creates a new entity collaborator in the database.
 *
 * @param {string} genericCollaboratorType - entity type for collaborator.
 * @param {Object} sequelize - The Sequelize instance.
 * @param {Object} transaction - The transaction object for atomicity.
 * @param {number} entityId - The ID of the entity.
 * @param {number} userId - The ID of the user.
 * @param {string} typeName - The name of the collaborator type.
 * @param {Object} linkBack - The link back object.
 * @returns {Promise<Object>} - A Promise that resolves to the created entity collaborator.
 */
const createCollaborator = async (
  genericCollaboratorType,
  sequelize,
  transaction,
  entityId,
  userId,
  typeName,
  linkBack = null,
) => {
  const collaboratorType = await getIdForCollaboratorType(
    genericCollaboratorType,
    sequelize,
    transaction,
    typeName,
  );

  if (!collaboratorType) {
    throw new Error(`No collaborator type found for "${typeName}" in ${collaboratorDetails[genericCollaboratorType].validFor}`);
  }

  const { id: collaboratorTypeId } = collaboratorType;

  return sequelize.models[collaboratorDetails[genericCollaboratorType].collaborators]
    .create({
      [collaboratorDetails[genericCollaboratorType].idName]: entityId,
      userId,
      collaboratorTypeId,
      linkBack,
    }, {
      ...(transaction && { transaction }),
    });
};

/**
 * Retrieves a entity collaborator record from the database.
 *
 * @param {string} genericCollaboratorType - entity type for collaborator.
 * @param {object} sequelize - The Sequelize instance.
 * @param {object} transaction - The transaction object.
 * @param {number} entityId - The ID of the entity.
 * @param {number} userId - The ID of the user.
 * @param {string} typeName - The name of the collaborator type.
 * @returns {Promise<object>} - A promise that resolves to the entity collaborator record.
 */
const getCollaboratorRecord = async (
  genericCollaboratorType,
  sequelize,
  transaction,
  entityId,
  userId,
  typeName,
  // Find the entity collaborator record in the database
) => sequelize.models[collaboratorDetails[genericCollaboratorType].collaborators]
  .findOne({
    where: {
      [collaboratorDetails[genericCollaboratorType].idName]: entityId,
      userId,
    },
    include: [{
      model: sequelize.models.CollaboratorType,
      as: 'collaboratorType',
      required: true,
      where: { name: typeName },
      attributes: ['name'],
      include: [{
        model: sequelize.models.ValidFor,
        as: 'validFor',
        required: true,
        attributes: [],
        where: { name: collaboratorDetails[genericCollaboratorType].validFor },
      }],
    }],
  }, {
    ...(transaction && { transaction }),
  });

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
 * Finds or creates a collaborator record in the database.
 *
 * @param {string} genericCollaboratorType - entity type for collaborator.
 * @param {Object} sequelize - The Sequelize instance.
 * @param {Object} transaction - The transaction object for database operations.
 * @param {number} entityId - The ID of the entity.
 * @param {number} userId - The ID of the user.
 * @param {string} typeName - The name of the collaborator type.
 * @param {Object} linkBack - The link back object.
 * @returns {Promise<Object>} - The entity collaborator record.
 */
const findOrCreateCollaborator = async (
  genericCollaboratorType,
  sequelize,
  transaction,
  entityId,
  userId,
  typeName,
  linkBack = null,
) => {
  const semaphoreKey = `${entityId}_${userId}_${typeName}`;
  await semaphore.acquire(semaphoreKey);
  // Check if a collaborator record already exists
  let collaborator = await getCollaboratorRecord(
    genericCollaboratorType,
    sequelize,
    transaction,
    entityId,
    userId,
    typeName,
  );

  // If no collaborator record found, create a new one
  if (!collaborator) {
    collaborator = await createCollaborator(
      genericCollaboratorType,
      sequelize,
      transaction,
      entityId,
      userId,
      typeName,
      linkBack,
    );
  } else {
    collaborator = await sequelize.models[
      collaboratorDetails[genericCollaboratorType].collaborators
    ].update(
      {
        linkBack: mergeObjects(collaborator.dataValues.linkBack, linkBack),
      },
      {
        where: { id: collaborator.dataValues.id },
        ...(transaction && { transaction }),
        individualHooks: true,
        returning: true,
      },
    );
  }
  semaphore.release(semaphoreKey);

  return collaborator;
};

/**
 * Populates the collaborator for a specific type of entity for the current user.
 *
 * @param {string} genericCollaboratorType - entity type for collaborator.
 * @param {Object} sequelize - The Sequelize instance.
 * @param {Object} options - Additional options for the query.
 * @param {number} entityId - The ID of the entity.
 * @param {string} typeName - The name of the collaborator type.
 * @param {Object} linkBack - The link back object.
 * @returns {Promise} A promise that resolves to the result of populating the collaborator.
 */
const currentUserPopulateCollaboratorForType = async (
  genericCollaboratorType,
  sequelize,
  transaction,
  entityId,
  typeName,
  linkBack = null,
) => {
  // Get the ID of the currently logged in user
  const userId = httpContext.get('impersonationUserId') || httpContext.get('loggedUser');
  if (!userId && process.env.NODE_ENV !== 'production') return Promise.resolve();

  // Populate the collaborator for the specified type of entity using the current user's
  // ID and typeName
  return findOrCreateCollaborator(
    genericCollaboratorType,
    sequelize,
    transaction,
    entityId,
    userId,
    typeName,
    linkBack,
  );
};

/**
 * Removes collaborators for a specific type and entity from the database.
 *
 * @param {string} genericCollaboratorType - entity type for collaborator.
 * @param {Object} sequelize - The Sequelize instance.
 * @param {Object} options - The options object.
 * @param {number} entityId - The ID of the entity.
 * @param {string} typeName - The name of the collaborator type.
 * @param {Object} linkBack - The link back object.
 */
const removeCollaboratorsForType = async (
  genericCollaboratorType,
  sequelize,
  transaction,
  entityId,
  typeName,
  linkBack = null,
) => {
  if (linkBack === null || linkBack === undefined) return;
  let filteredLinkBack;
  if (typeof linkBack === 'object') {
    filteredLinkBack = Object.entries(linkBack).reduce((acc, [key, values]) => {
      if (Array.isArray(values)) {
        const filteredValues = values.filter((v) => v);
        if (filteredValues.length > 0) {
          acc[key] = filteredValues;
        }
      }
      return acc;
    }, {});
    if (Object.keys(filteredLinkBack).length === 0) return;
  } else {
    return;
  }

  // Extract the key-value pair from the linkBack object
  const [[linkBackKey, linkBackValues]] = Object.entries(filteredLinkBack);

  // Find all entity CollaboratorType records that meet the specified criteria
  const currentCollaboratorsForType = await sequelize.models[
    collaboratorDetails[genericCollaboratorType].collaborators
  ].findAll({
    where: {
      [collaboratorDetails[genericCollaboratorType].idName]: entityId,
      linkBack: { [Op.contains]: filteredLinkBack },
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
          where: { name: collaboratorDetails[genericCollaboratorType].validFor },
        }],
      },
    ],
    ...(transaction && { transaction }),
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

    // Update the entity CollaboratorType records and delete the specified records
    const updatePromises = (updates.length > 0
      ? updates.map(async (update) => sequelize.models[
        collaboratorDetails[genericCollaboratorType].collaborators
      ].update(
        { linkBack: update.linkBack },
        {
          where: { id: update.id },
          individualHooks: true,
          ...(transaction && { transaction }),
        },
      ))
      : [Promise.resolve()]);
    const deletePromise = (deletes.length > 0
      ? sequelize.models[
        collaboratorDetails[genericCollaboratorType].collaborators
      ].destroy({
        where: { id: deletes },
        individualHooks: true,
        ...(transaction && { transaction }),
      })
      : Promise.resolve());

    await Promise.all([
      ...updatePromises,
      deletePromise,
    ]);
  }
};

export {
  createCollaborator,
  getCollaboratorRecord,
  findOrCreateCollaborator,
  getIdForCollaboratorType,
  currentUserPopulateCollaboratorForType,
  removeCollaboratorsForType,
};
