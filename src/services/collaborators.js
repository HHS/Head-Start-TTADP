import { Op, sequelize } from 'sequelize';
import { result } from 'lodash';
import { User, Collaborator, Role } from '../models';
import { COLLABORATOR_TYPES } from '../constants';
import { auditLogger } from '../logger';

export async function upsertCollaborator(values) {
  // Create collaborator, on unique constraint violation do update
  const {
    entityType,
    entityId,
    collaboratorTypes,
    userId,
    tier,
    ...others
  } = values;

  try {
    if (collaboratorTypes.length < 1) {
      throw new Error('At least one collaborator type is required to create a collaborator.');
    }
  } catch (err) {
    auditLogger.error(JSON.stringify({ name: 'upsertCollaborator', index: 1, values, err }));
    throw new Error(err);
  }

  // Try to find a current collaborator
  let collaborator;
  try {
    collaborator = await Collaborator.findOne({ where: { entityType, entityId, userId } });
  } catch (err) {
    auditLogger.error(JSON.stringify({ name: 'upsertCollaborator', index: 1.5, values, err}));
    throw new Error(err);
  }
  try {
    // Try to find a collaborator that has been deleted
    if (!collaborator) {
      collaborator = await Collaborator.findOne({
        where: { entityType, entityId, userId },
        paranoid: false,
      });
      if (collaborator) {
        collaborator = await Collaborator.restore({
          where: { entityType, entityId, userId },
          paranoid: false,
          individualHooks: true,
        });
      }
    }
  } catch (err) {
    auditLogger.error(JSON.stringify({ name: 'upsertCollaborator', index: 2, values, err}));
    throw new Error(err);
  }
  try {
    // Update the found collaborator
    if (collaborator) {
      // de-duped collaboratorTypes array
      let newCollaboratorTypes;
      try {
        const tmpArray = [
          ...collaboratorTypes,
          ...collaborator.collaboratorTypes,
        ];
        newCollaboratorTypes = [...new Set(tmpArray)];
      } catch (err) {
        auditLogger.error(JSON.stringify({ name: 'upsertCollaborator', index: 2.4, values, err, newCollaboratorTypes, collaborator}));
        throw new Error(err);
      }
      try {
        await collaborator.update({
          collaboratorTypes: newCollaboratorTypes,
          tier,
          ...others,
        }, {
          individualHooks: true,
          // logging: (msg) => auditLogger.error(JSON.stringify({ name: 'upsertCollaborator - update', msg })),
        });
      } catch (err) {
        auditLogger.error(JSON.stringify({ name: 'upsertCollaborator', index: 2.5, values, err}));
        throw new Error(err);
      }
    } else {
      // If not collaborator was found create it
      try {
        collaborator = await Collaborator.create(
          {
            entityType,
            entityId,
            userId,
            tier,
            collaboratorTypes,
            ...others,
          },
        );
      } catch (err) {
        collaborator = await Collaborator.findOne({ where: { entityType, entityId, userId } });
        auditLogger.error(JSON.stringify({ name: 'upsertCollaborator', index: 2.8, values, err, collaborator}));
        throw new Error(err);
      }
    }
  } catch (err) {
    auditLogger.error(JSON.stringify({ name: 'upsertCollaborator', index: 3, values, err}));
    throw new Error(err);
  }

  try {
    if (collaborator) {
      try {
        collaborator = await Collaborator.findOne({
          where: { entityType, entityId, userId },
          include: [
            {
              model: User,
              as: 'user',
            },
            {
              model: Role,
              as: 'roles',
            },
          ],
        });
      } catch (err) {
        auditLogger.error(JSON.stringify({ name: 'upsertCollaborator', index: 3.5, values, err}));
        throw new Error(err);
      }
    }
  } catch (err) {
    auditLogger.error(JSON.stringify({ name: 'upsertCollaborator', index: 4, values, err}));
    throw new Error(err);
  }
  return collaborator;
}

export async function upsertOwnerInstantiator(values) {
  return upsertCollaborator({
    ...values,
    collaboratorTypes: [COLLABORATOR_TYPES.INSTANTIATOR, COLLABORATOR_TYPES.OWNER],
  });
}

export async function upsertInstantiator(values) {
  return upsertCollaborator({ ...values, collaboratorTypes: [COLLABORATOR_TYPES.INSTANTIATOR] });
}

export async function upsertOwner(values) {
  return upsertCollaborator({ ...values, collaboratorTypes: [COLLABORATOR_TYPES.OWNER] });
}

export async function upsertEditor(values) {
  return upsertCollaborator({ ...values, collaboratorTypes: [COLLABORATOR_TYPES.EDITOR] });
}

export async function upsertRatifier(values) {
  return upsertCollaborator({ ...values, collaboratorTypes: [COLLABORATOR_TYPES.RATIFIER] });
}

export async function syncCollaborators(
  entityType,
  entityId,
  collaboratorTypes = [],
  perUserData = [],
  tier = 1,
) {
  let preexistingCollaborators;
  try {
    preexistingCollaborators = await Collaborator.findAll({
      where: {
        entityType,
        entityId,
        tier,
      },
    });
  } catch (err) {
    auditLogger.error(JSON.stringify({ name: 'syncCollaborators', index: 1, err }));
    throw new Error(err);
  }

  let userIds;
  try {
    userIds = perUserData && Array.isArray(perUserData) && perUserData.length > 1
      ? perUserData
        .map((userData) => (userData ? userData.userId : null))
        .filter((userId) => userId !== null)
      : [];
  } catch (err) {
    auditLogger.error(JSON.stringify({ name: 'syncCollaborators', index: 2, err }));
    throw new Error(err);
  }

  try {
    // Create or restore collaborator
    if (perUserData && perUserData.length > 0) {
      const uniquePerUserData = perUserData && Array.isArray(perUserData) && perUserData.length > 0
        ? perUserData
          .filter((v, i, a) => a.findIndex((v2) => (v2.userId === v.userId)) === i)
          .filter((userData) => userData.userId !== null && userData.userId !== undefined)
        : [];

      await Promise.all(uniquePerUserData.map(async (userData) => upsertCollaborator({
        ...userData,
        entityType,
        entityId,
        collaboratorTypes,
        tier,
      })));
    }
  } catch (err) {
    auditLogger.error(JSON.stringify({ name: 'syncCollaborators', index: 4, err }));
    throw new Error(err);
  }

  try {
    // Remove any preexisting collaborators now missing from userId request param
    if (preexistingCollaborators && preexistingCollaborators.length > 0) {
      await Promise.all(collaboratorTypes.map(async (collaboratorType) => {
        const collaboratorsToRemove = preexistingCollaborators
          .filter((a) => !userIds.includes(a.userId))
          .filter((a) => a.collaboratorTypes.includes(collaboratorType));
        await Promise.all(collaboratorsToRemove.map(async (collaborator) => Collaborator
          .update({
            collaboratorTypes: collaborator.collaboratorTypes
              .filter((type) => type !== collaboratorType),
          }, {
            where: {
              id: collaborator.id,
              collaboratorTypes: { [Op.contains]: collaboratorType },
            },
          })));
      }));
    }
  } catch (err) {
    auditLogger.error(JSON.stringify({ name: 'syncCollaborators', index: 3, err }));
    throw new Error(err);
  }

  let collaborators;
  try {
    collaborators = await Collaborator.findAll({
      where: {
        entityType,
        entityId,
        tier,
        collaboratorTypes: { [Op.overlap]: collaboratorTypes },
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email'],
          raw: true,
        },
        {
          model: Role,
          as: 'roles',
          required: false,
        },
      ],
      // logging: (msg) => auditLogger.error(JSON.stringify({ name: 'syncCollaborators', msg })),
    });
  } catch (err) {
    auditLogger.error(JSON.stringify({ name: 'syncCollaborators', collaborators, err }));
    throw new Error(err);
  }
  auditLogger.info(JSON.stringify({ name: 'finish syncCollaborators', perUserData, collaborators }));
  return collaborators;
}

export async function syncOwnerInstantiators(entityType, entityId, perUserData = [], tier = 1) {
  return syncCollaborators(
    entityType,
    entityId,
    [COLLABORATOR_TYPES.OWNER, COLLABORATOR_TYPES.INSTANTIATOR],
    perUserData,
    tier,
  );
}

export async function syncOwner(entityType, entityId, perUserData = [], tier = 1) {
  return syncCollaborators(entityType, entityId, [COLLABORATOR_TYPES.OWNER], perUserData, tier);
}

export async function syncInstantiators(entityType, entityId, perUserData = [], tier = 1) {
  return syncCollaborators(
    entityType,
    entityId,
    [COLLABORATOR_TYPES.INSTANTIATOR],
    perUserData,
    tier,
  );
}

export async function syncEditors(entityType, entityId, perUserData = [], tier = 1) {
  return syncCollaborators(entityType, entityId, [COLLABORATOR_TYPES.EDITOR], perUserData, tier);
}

export async function syncRatifiers(entityType, entityId, perUserData = [], tier = 1) {
  return syncCollaborators(entityType, entityId, [COLLABORATOR_TYPES.RATIFIER], perUserData, tier);
}

export async function getCollaborator(entityType, entityId, userId) {
  return Collaborator.findOne({
    where: {
      entityType,
      entityId,
      userId,
    },
    include: [
      { model: User, as: 'user' },
      { model: Role, as: 'roles' },
    ],
  });
}

export async function setRatifierStatus(entityType, entityId, userId, status) {
  const ratifier = await getCollaborator(
    entityType,
    entityId,
    userId,
  );
  auditLogger.error(JSON.stringify({ name: 'setRatifierStatus', ratifier }));
  if (ratifier && ratifier.collaboratorTypes.includes(COLLABORATOR_TYPES.RATIFIER)) {
    await ratifier.update({ status }, { individualHooks: true });
    return getCollaborator(
      entityType,
      entityId,
      userId,
    );
  }
  throw new Error('No ratifier found for passed values.');
}

export async function setRatifierNote(entityType, entityId, userId, note) {
  const ratifier = await getCollaborator(
    entityType,
    entityId,
    userId,
  );
  if (ratifier && ratifier.collaboratorTypes.includes(COLLABORATOR_TYPES.RATIFIER)) {
    await ratifier.update({ note }, { individualHooks: true });
    return getCollaborator(
      entityType,
      entityId,
      userId,
    );
  }
  throw new Error('No ratifier found for passed values.');
}

export async function getCollaboratorsByType(entityType, entityId, collaboratorType) {
  return Collaborator.findAll({
    where: {
      entityType,
      entityId,
      collaboratorTypes: { [Op.contains]: collaboratorType },
    },
  });
}

export async function resetAllRatifierStatuses(entityType, entityId, status, tier = 1) {
  const ratifiers = await getCollaboratorsByType(entityType, entityId, COLLABORATOR_TYPES.RATIFIER);
  let promises = [];
  if (ratifiers && ratifiers.length > 0) {
    promises = ratifiers.filter((ratifier) => ratifier.tier === tier)
      .map(async (ratifier) => ratifier.update({ status }, { individualHooks: true }));
  }
  return Promise.all([...promises]);
}

export async function addCollaboratorType(entityType, entityId, userIds, collaboratorType) {
  const collaborator = getCollaborator(entityType, entityId, userIds);
  const newCollaboratorTypes = [...new Set([
    collaboratorType,
    ...collaborator.collaboratorTypes,
  ])];
  await collaborator.update({
    collaboratorTypes: newCollaboratorTypes,
  }, { individualHooks: true });
}

export async function removeCollaboratorType(entityType, entityId, userId, collaboratorType) {
  const collaborator = getCollaborator(entityType, entityId, userId);
  const newCollaboratorTypes = collaborator.collaboratorTypes
    .filter((type) => type !== collaboratorType);
  await collaborator.update({
    collaboratorTypes: newCollaboratorTypes,
  }, { individualHooks: true });
}

export async function removeInstantiator(entityType, entityId, userId) {
  return removeCollaboratorType(entityType, entityId, userId, COLLABORATOR_TYPES.INSTANTIATOR);
}

export async function removeOwner(entityType, entityId, userId) {
  return removeCollaboratorType(entityType, entityId, userId, COLLABORATOR_TYPES.OWNER);
}

export async function removeEditor(entityType, entityId, userId) {
  return removeCollaboratorType(entityType, entityId, userId, COLLABORATOR_TYPES.EDITOR);
}

export async function removeRatifier(entityType, entityId, userId) {
  return removeCollaboratorType(entityType, entityId, userId, COLLABORATOR_TYPES.RATIFIER);
}

export async function setEditorNote(entityType, entityId, userId, note) {
  const editor = await getCollaborator(
    entityType,
    entityId,
    userId,
  );
  if (editor && editor.collaboratorType.includes(COLLABORATOR_TYPES.EDITOR)) {
    return editor.update({ note }, { individualHooks: true });
  }
  throw new Error('No editor found for passed values.');
}
