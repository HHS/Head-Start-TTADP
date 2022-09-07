import { Op } from 'sequelize';
import { User, Collaborator } from '../models';
import { COLLABORATOR_TYPES } from '../constants';

export async function upsertCollaborator(values) {
  // Create collaborator, on unique constraint violation do update
  const {
    entityType,
    entityId,
    userId,
    tier,
    collaboratorTypes,
    ...newValues
  } = values;

  if (collaboratorTypes.length < 1) {
    throw new Error('At least one collaborator type is required to create a collaborator.');
  }

  // Try to find a current collaborator
  let collaborator = await Collaborator.findOne({ where: { entityType, entityId, userId } });

  // Try to find a collaborator that has been deleted
  if (!collaborator) {
    collaborator = await Collaborator.findOne({
      where: { entityType, entityId, userId },
      paranoid: false,
    });
    if (collaborator) {
      collaborator = await Collaborator.restore({
        where: { entityType, entityId, userId },
        individualHooks: true,
      });
    }
  }

  // Update the found collaborator
  if (collaborator) {
    // de-duped collaboratorTypes array
    const newCollaboratorTypes = [...new Set([
      ...collaboratorTypes,
      ...collaborator.collaboratorTypes,
    ])];
    await collaborator.update({
      collaboratorTypes: newCollaboratorTypes,
      tier,
      ...newValues,
    });
  } else {
    try {
      // If not collaborator was found create it
      collaborator = await Collaborator.create({
        ...values,
      });
    } catch (err) {
      console.error(err);
      throw new Error('At least one collaborator type is required to create a collaborator.');
    }
  }

  if (collaborator) {
    collaborator = await collaborator.get({ plain: true });
    const user = await User.findOne({
      attributes: ['email', 'name', 'fullName'],
      where: { id: collaborator.userId },
    });
    if (user) {
      collaborator.User = await user.get({ plain: true });
    }
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
  collaboratorType,
  userIds = [],
  tier = 1,
) {
  const preexistingCollaborators = await Collaborator.findAll({
    where: {
      entityType,
      entityId,
      tier,
    },
  });

  // Remove any preexisting collaborators now missing from userId request param
  if (preexistingCollaborators && preexistingCollaborators.length > 0) {
    const collaboratorsToRemove = preexistingCollaborators
      .filter((a) => !userIds.includes(a.userId));
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
  }

  // Create or restore collaborator
  if (userIds.length > 0) {
    const uniqueUserIds = [...new Set(userIds)];
    await Promise.all(uniqueUserIds.map(async (userId) => upsertCollaborator({
      entityType,
      entityId,
      userId,
      collaboratorTypes: [collaboratorType],
      tier,
    })));
  }

  return Collaborator.findAll({
    where: {
      entityType,
      entityId,
      tier,
      collaboratorTypes: { [Op.contains]: collaboratorType },
    },
    include: [
      {
        model: User,
        attributes: ['id', 'name', 'email'],
        raw: true,
      },
    ],
  });
}

export async function syncOwnerInstantiators(entityType, entityId, userIds = [], tier = 1) {
  return Promise.all([
    syncCollaborators(entityType, entityId, COLLABORATOR_TYPES.OWNER, userIds, tier),
    syncCollaborators(entityType, entityId, COLLABORATOR_TYPES.INSTANTIATOR, userIds, tier),
  ]);
}

export async function syncOwners(entityType, entityId, userIds = [], tier = 1) {
  return syncCollaborators(entityType, entityId, COLLABORATOR_TYPES.OWNER, userIds, tier);
}

export async function syncInstantiators(entityType, entityId, userIds = [], tier = 1) {
  return syncCollaborators(entityType, entityId, COLLABORATOR_TYPES.INSTANTIATOR, userIds, tier);
}

export async function syncEditors(entityType, entityId, userIds = [], tier = 1) {
  return syncCollaborators(entityType, entityId, COLLABORATOR_TYPES.EDITOR, userIds, tier);
}

export async function syncRatifiers(entityType, entityId, userIds = [], tier = 1) {
  return syncCollaborators(entityType, entityId, COLLABORATOR_TYPES.RATIFIER, userIds, tier);
}

export async function getCollaborator(entityType, entityId, userIds) {
  return Collaborator.findOne({
    where: {
      entityType,
      entityId,
      userIds,
    },
  });
}

export async function setRatifierStatus(entityType, entityId, userIds, status) {
  const ratifier = await getCollaborator(
    entityType,
    entityId,
    userIds,
  );
  if (ratifier && ratifier.collaboratorType.includes(COLLABORATOR_TYPES.RATIFIER)) {
    await ratifier.update({ status }, { individualHooks: true });
    return ratifier;
  }
  throw new Error('No ratifier found for passed values.');
}

export async function setRatifierNote(entityType, entityId, userIds, note) {
  const ratifier = await getCollaborator(
    entityType,
    entityId,
    userIds,
  );
  if (ratifier && ratifier.collaboratorType.includes(COLLABORATOR_TYPES.RATIFIER)) {
    await ratifier.update({ note }, { individualHooks: true });
    return ratifier;
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

export async function removeCollaboratorType(entityType, entityId, userIds, collaboratorType) {
  const collaborator = getCollaborator(entityType, entityId, userIds);
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

export async function setEditorNote(entityType, entityId, userIds, note) {
  const editor = await getCollaborator(
    entityType,
    entityId,
    userIds,
  );
  if (editor && editor.collaboratorType.includes(COLLABORATOR_TYPES.EDITOR)) {
    return editor.update({ note }, { individualHooks: true });
  }
  throw new Error('No editor found for passed values.');
}
