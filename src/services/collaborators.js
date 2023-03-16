import { Op } from 'sequelize';
import {
  User,
  Collaborator,
  Role,
  ActivityReportCollaborator,
} from '../models';
import { COLLABORATOR_TYPES } from '../constants';
import { auditLogger } from '../logger';

export async function upsertCollaborator(collaboratorModel, foreignKeyId, values) {
  // Create collaborator, on unique constraint violation do update
  const {
    [foreignKeyId]: genericId,
    collaboratorTypes,
    userId,
    ...others
  } = values;

  try {
    if (collaboratorTypes.length < 1) {
      throw new Error('At least one collaborator type is required to create a collaborator.');
    }
  } catch (err) {
    auditLogger.error(
      JSON.stringify({
        name: 'upsertCollaborator',
        index: 1,
        values,
        err,
      }),
    );
    throw new Error(err);
  }

  // Try to find a current collaborator
  let collaborator;
  try {
    collaborator = await collaboratorModel.findOne({
      where: {
        [foreignKeyId]: genericId,
        userId,
      },
    });
  } catch (err) {
    auditLogger.error(JSON.stringify({
      name: 'upsertCollaborator',
      index: 1.5,
      values,
      err,
    }));
    throw new Error(err);
  }
  try {
    // Try to find a collaborator that has been deleted
    if (!collaborator) {
      collaborator = await collaboratorModel.findOne({
        where: {
          [foreignKeyId]: genericId,
          userId,
        },
        paranoid: false,
      });
      if (collaborator) {
        collaborator = await collaboratorModel.restore({
          where: {
            [foreignKeyId]: genericId,
            userId,
          },
          paranoid: false,
          individualHooks: true,
        });
      }
    }
  } catch (err) {
    auditLogger.error(JSON.stringify({
      name: 'upsertCollaborator',
      index: 2,
      values,
      err,
    }));
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
        auditLogger.error(
          JSON.stringify({
            name: 'upsertCollaborator',
            index: 2.4,
            values,
            err,
            newCollaboratorTypes,
            collaborator,
          }),
        );
        throw new Error(err);
      }
      try {
        await collaborator.update({
          collaboratorTypes: newCollaboratorTypes,
          ...others,
        }, {
          individualHooks: true,
        });
      } catch (err) {
        auditLogger.error(
          JSON.stringify({
            name: 'upsertCollaborator',
            index: 2.5,
            values,
            err,
          }),
        );
        throw new Error(err);
      }
    } else {
      // If not collaborator was found create it
      try {
        collaborator = await collaboratorModel.create(
          {
            [foreignKeyId]: genericId,
            userId,
            collaboratorTypes,
            ...others,
          },
        );
      } catch (err) {
        collaborator = await collaboratorModel.findOne({
          where: {
            [foreignKeyId]: genericId,
            userId,
          },
        });
        auditLogger.error(
          JSON.stringify({
            name: 'upsertCollaborator',
            index: 2.8,
            values,
            err,
            collaborator,
          }),
        );
        throw new Error(err);
      }
    }
  } catch (err) {
    auditLogger.error(
      JSON.stringify({
        name: 'upsertCollaborator',
        index: 3,
        values,
        err,
      }),
    );
    throw new Error(err);
  }

  try {
    if (collaborator) {
      try {
        return collaboratorModel.findOne({
          where: {
            [foreignKeyId]: genericId,
            userId,
          },
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
        auditLogger.error(
          JSON.stringify({
            name: 'upsertCollaborator',
            index: 3.5,
            values,
            err,
          }),
        );
        throw new Error(err);
      }
    }
  } catch (err) {
    auditLogger.error(
      JSON.stringify({
        name: 'upsertCollaborator',
        index: 4,
        values,
        err,
      }),
    );
    throw new Error(err);
  }
  return collaborator;
}

export const upsertOwnerInstantiator = async (
  collaboratorModel,
  foreignKeyId,
  values,
) => upsertCollaborator(
  collaboratorModel,
  foreignKeyId,
  {
    ...values,
    collaboratorTypes: [COLLABORATOR_TYPES.INSTANTIATOR, COLLABORATOR_TYPES.OWNER],
  },
);

export const upsertInstantiator = async (
  collaboratorModel,
  foreignKeyId,
  values,
) => upsertCollaborator(
  collaboratorModel,
  foreignKeyId,
  {
    ...values,
    collaboratorTypes: [COLLABORATOR_TYPES.INSTANTIATOR],
  },
);

export const upsertOwner = async (
  collaboratorModel,
  foreignKeyId,
  values,
) => upsertCollaborator(
  collaboratorModel,
  foreignKeyId,
  {
    ...values,
    collaboratorTypes: [COLLABORATOR_TYPES.OWNER],
  },
);

export const upsertEditor = async (
  collaboratorModel,
  foreignKeyId,
  values,
) => upsertCollaborator(
  collaboratorModel,
  foreignKeyId,
  {
    ...values,
    collaboratorTypes: [COLLABORATOR_TYPES.EDITOR],
  },
);

export const upsertApprover = async (
  collaboratorModel,
  foreignKeyId,
  values,
) => upsertCollaborator(
  collaboratorModel,
  foreignKeyId,
  {
    ...values,
    collaboratorTypes: [COLLABORATOR_TYPES.APPROVER],
  },
);

export async function syncCollaborators(
  collaboratorModel,
  foreignKeyId,
  genericId,
  collaboratorTypes = [],
  perUserData = [],
) {
  let preexistingCollaborators;
  try {
    preexistingCollaborators = await collaboratorModel
      .findAll({ where: { [foreignKeyId]: genericId } });
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

      await Promise.all(uniquePerUserData.map(async (userData) => upsertCollaborator(
        collaboratorModel,
        foreignKeyId,
        {
          ...userData,
          [foreignKeyId]: genericId,
          collaboratorTypes,
        },
      )));
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
        await Promise.all(collaboratorsToRemove.map(async (collaborator) => collaboratorModel
          .update({
            collaboratorTypes: collaborator.collaboratorTypes
              .filter((type) => type !== collaboratorType),
          }, {
            where: {
              id: collaborator.id,
              collaboratorTypes: { [Op.contains]: [collaboratorType] },
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
    collaborators = await collaboratorModel.findAll({
      where: {
        [foreignKeyId]: genericId,
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

export const syncOwnerInstantiators = async (
  collaboratorModel,
  foreignKeyId,
  genericId,
  perUserData = [],
) => syncCollaborators(
  collaboratorModel,
  foreignKeyId,
  genericId,
  [COLLABORATOR_TYPES.OWNER, COLLABORATOR_TYPES.INSTANTIATOR],
  perUserData,
);

export const syncOwner = async (
  collaboratorModel,
  foreignKeyId,
  genericId,
  perUserData = [],
) => syncCollaborators(
  collaboratorModel,
  foreignKeyId,
  genericId,
  [COLLABORATOR_TYPES.OWNER],
  perUserData,
);

export const syncInstantiators = async (
  collaboratorModel,
  foreignKeyId,
  genericId,
  perUserData = [],
) => syncCollaborators(
  collaboratorModel,
  foreignKeyId,
  genericId,
  [COLLABORATOR_TYPES.INSTANTIATOR],
  perUserData,
);

export const syncEditors = async (
  collaboratorModel,
  foreignKeyId,
  genericId,
  perUserData = [],
) => syncCollaborators(
  collaboratorModel,
  foreignKeyId,
  genericId,
  [COLLABORATOR_TYPES.EDITOR],
  perUserData,
);

export const syncApprovers = async (
  collaboratorModel,
  foreignKeyId,
  genericId,
  perUserData = [],
) => syncCollaborators(
  collaboratorModel,
  foreignKeyId,
  genericId,
  [COLLABORATOR_TYPES.APPROVER],
  perUserData,
);

export const getCollaborator = async (
  collaboratorModel,
  foreignKeyId,
  genericId,
  userId,
) => collaboratorModel.findOne({
  where: {
    [foreignKeyId]: genericId,
    userId,
  },
  include: [
    { model: User, as: 'user' },
    { model: Role, as: 'roles' },
  ],
});

export const getCollaborators = async (
  collaboratorModel,
  foreignKeyId,
  genericId,
  collaboratorTypes = [],
) => collaboratorModel.findAll({
  where: {
    [foreignKeyId]: genericId,
    collaboratorTypes: { [Op.overlap]: collaboratorTypes },
  },
  include: [
    { model: User, as: 'user' },
    { model: Role, as: 'roles' },
  ],
});

export async function setApproverStatus(
  collaboratorModel,
  foreignKeyId,
  genericId,
  userId,
  status,
) {
  const approver = await getCollaborator(
    collaboratorModel,
    foreignKeyId,
    genericId,
    userId,
  );
  auditLogger.error(JSON.stringify({ name: 'setApproverStatus', approver }));
  if (approver && approver.collaboratorTypes.includes(COLLABORATOR_TYPES.APPROVER)) {
    await approver.update({ status }, { individualHooks: true });
    return getCollaborator(
      collaboratorModel,
      foreignKeyId,
      genericId,
      userId,
    );
  }
  throw new Error('No approver found for passed values.');
}

export async function setApproverNote(
  collaboratorModel,
  foreignKeyId,
  genericId,
  userId,
  note,
) {
  const approver = await getCollaborator(
    collaboratorModel,
    foreignKeyId,
    genericId,
    userId,
  );
  if (approver && approver.collaboratorTypes.includes(COLLABORATOR_TYPES.APPROVER)) {
    await approver.update({ note }, { individualHooks: true });
    return getCollaborator(
      collaboratorModel,
      foreignKeyId,
      genericId,
      userId,
    );
  }
  throw new Error('No approver found for passed values.');
}

export const getCollaboratorsByType = async (
  collaboratorModel,
  foreignKeyId,
  genericId,
  collaboratorType,
) => collaboratorModel.findAll({
  where: {
    [foreignKeyId]: genericId,
    collaboratorTypes: { [Op.contains]: [collaboratorType] },
  },
  include: [
    { model: User, as: 'user' },
    { model: Role, as: 'roles' },
  ],
});

export async function resetAllApproverStatuses(
  collaboratorModel,
  foreignKeyId,
  genericId,
  status,
) {
  const approvers = await getCollaboratorsByType(
    collaboratorModel,
    foreignKeyId,
    genericId,
    COLLABORATOR_TYPES.APPROVER,
  );
  let promises = [];
  if (approvers && approvers.length > 0) {
    promises = approvers
      .map(async (approver) => approver.update({ status }, { individualHooks: true }));
  }
  return Promise.all([...promises]);
}

export async function addCollaboratorType(
  collaboratorModel,
  foreignKeyId,
  genericId,
  userIds,
  collaboratorType,
) {
  const collaborator = getCollaborator(
    collaboratorModel,
    foreignKeyId,
    genericId,
    userIds,
  );
  const newCollaboratorTypes = [...new Set([
    collaboratorType,
    ...collaborator.collaboratorTypes,
  ])];
  await collaborator.update({
    collaboratorTypes: newCollaboratorTypes,
  }, { individualHooks: true });
}

export async function removeCollaboratorType(
  collaboratorModel,
  foreignKeyId,
  genericId,
  userId,
  collaboratorType,
) {
  const collaborator = getCollaborator(
    collaboratorModel,
    foreignKeyId,
    genericId,
    userId,
  );
  const newCollaboratorTypes = collaborator.collaboratorTypes
    .filter((type) => type !== collaboratorType);
  await collaborator.update({
    collaboratorTypes: newCollaboratorTypes,
  }, { individualHooks: true });
}

export const removeInstantiator = async (
  collaboratorModel,
  foreignKeyId,
  genericId,
  userId,
) => removeCollaboratorType(
  collaboratorModel,
  foreignKeyId,
  genericId,
  userId,
  COLLABORATOR_TYPES.INSTANTIATOR,
);

export const removeOwner = async (
  collaboratorModel,
  foreignKeyId,
  genericId,
  userId,
) => removeCollaboratorType(
  collaboratorModel,
  foreignKeyId,
  genericId,
  userId,
  COLLABORATOR_TYPES.OWNER,
);

export const removeEditor = async (
  collaboratorModel,
  foreignKeyId,
  genericId,
  userId,
) => removeCollaboratorType(
  collaboratorModel,
  foreignKeyId,
  genericId,
  userId,
  COLLABORATOR_TYPES.EDITOR,
);

export const removeApprover = async (
  collaboratorModel,
  foreignKeyId,
  genericId,
  userId,
) => removeCollaboratorType(
  collaboratorModel,
  foreignKeyId,
  genericId,
  userId,
  COLLABORATOR_TYPES.APPROVER,
);

export async function setEditorNote(
  collaboratorModel,
  foreignKeyId,
  genericId,
  userId,
  note,
) {
  const editor = await getCollaborator(
    collaboratorModel,
    foreignKeyId,
    genericId,
    userId,
  );
  if (editor && editor.collaboratorType.includes(COLLABORATOR_TYPES.EDITOR)) {
    return editor.update({ note }, { individualHooks: true });
  }
  throw new Error('No editor found for passed values.');
}

//----------------------

export const upsertReportCollaborator = async (values) => upsertCollaborator(
  ActivityReportCollaborator,
  'activityReportId',
  values,
);

export const upsertReportOwnerInstantiator = async (values) => upsertOwnerInstantiator(
  ActivityReportCollaborator,
  'activityReportId',
  values,
);

export const upsertReportOwner = async (values) => upsertOwner(
  ActivityReportCollaborator,
  'activityReportId',
  values,
);

export const upsertReportEditor = async (values) => upsertEditor(
  ActivityReportCollaborator,
  'activityReportId',
  values,
);

export const upsertReportApprover = async (values) => upsertApprover(
  ActivityReportCollaborator,
  'activityReportId',
  values,
);

export const syncReportCollaborators = async (
  genericId,
  collaboratorTypes = [],
  perUserData = [],
) => syncCollaborators(
  ActivityReportCollaborator,
  'activityReportId',
  genericId,
  collaboratorTypes,
  perUserData,
);

export const syncReportOwnerInstantiators = async (
  genericId,
  perUserData = [],
) => syncOwnerInstantiators(
  ActivityReportCollaborator,
  'activityReportId',
  genericId,
  perUserData,
);

export const syncReportOwner = async (
  genericId,
  perUserData = [],
) => syncOwner(
  ActivityReportCollaborator,
  'activityReportId',
  genericId,
  perUserData,
);

export const syncReportInstantiators = async (
  genericId,
  perUserData = [],
) => syncInstantiators(
  ActivityReportCollaborator,
  'activityReportId',
  genericId,
  perUserData,
);

export const syncReportEditors = async (
  genericId,
  perUserData = [],
) => syncEditors(
  ActivityReportCollaborator,
  'activityReportId',
  genericId,
  perUserData,
);

export const syncReportApprovers = async (
  genericId,
  perUserData = [],
) => syncApprovers(
  ActivityReportCollaborator,
  'activityReportId',
  genericId,
  perUserData,
);

export const getReportCollaborator = async (
  genericId,
  userId,
) => getCollaborator(
  ActivityReportCollaborator,
  'activityReportId',
  genericId,
  userId,
);

export const getReportCollaborators = async (
  genericId,
  collaboratorTypes = [],
) => getCollaborators(
  ActivityReportCollaborator,
  'activityReportId',
  genericId,
  collaboratorTypes,
);

export const setReportApproverStatus = async (
  genericId,
  userId,
  status,
) => setApproverStatus(
  ActivityReportCollaborator,
  'activityReportId',
  genericId,
  userId,
  status,
);

export const setReportApproverNote = async (
  genericId,
  userId,
  note,
) => setApproverNote(
  ActivityReportCollaborator,
  'activityReportId',
  genericId,
  userId,
  note,
);

export const getReportCollaboratorsByType = async (
  genericId,
  collaboratorType,
) => getCollaboratorsByType(
  ActivityReportCollaborator,
  'activityReportId',
  genericId,
  collaboratorType,
);

export const resetAllReportApproverStatuses = async (
  genericId,
  status,
) => resetAllApproverStatuses(
  ActivityReportCollaborator,
  'activityReportId',
  genericId,
  status,
);

export const addReportCollaboratorType = async (
  genericId,
  userIds,
  collaboratorType,
) => addCollaboratorType(
  ActivityReportCollaborator,
  'activityReportId',
  genericId,
  userIds,
  collaboratorType,
);

export const removeReportCollaboratorType = async (
  genericId,
  userId,
  collaboratorType,
) => removeCollaboratorType(
  ActivityReportCollaborator,
  'activityReportId',
  genericId,
  userId,
  collaboratorType,
);

export const removeReportInstantiator = async (
  genericId,
  userId,
) => removeInstantiator(
  ActivityReportCollaborator,
  'activityReportId',
  genericId,
  userId,
);

export const removeReportOwner = async (
  genericId,
  userId,
) => removeOwner(
  ActivityReportCollaborator,
  'activityReportId',
  genericId,
  userId,
);

export const removeReportEditor = async (
  genericId,
  userId,
) => removeEditor(
  ActivityReportCollaborator,
  'activityReportId',
  genericId,
  userId,
);

export const removeReportApprover = async (
  genericId,
  userId,
) => removeApprover(
  ActivityReportCollaborator,
  'activityReportId',
  genericId,
  userId,
);

export const setReportEditorNote = async (
  genericId,
  userId,
  note,
) => setEditorNote(
  ActivityReportCollaborator,
  'activityReportId',
  genericId,
  userId,
  note,
);
