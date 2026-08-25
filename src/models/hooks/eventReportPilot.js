/* eslint-disable global-require */
const { auditLogger } = require('../../logger');
const { purifyDataFields } = require('../helpers/purifyFields');

const fieldsToEscape = ['eventName'];

// Keep the dedicated `eventId` column in sync with the `data.eventId` JSON value.
// Only mirrors when `data` is a plain object exposing a string eventId, so it never
// clobbers a value set explicitly by the service (where `data` is a sequelize cast literal).
const mirrorEventId = (instance) => {
  const dataEventId = instance.data && instance.data.eventId;
  if (typeof dataEventId === 'string' && dataEventId.length > 0) {
    instance.eventId = dataEventId;
  }
};

const notifyNewCollaborators = async (_sequelize, instance) => {
  try {
    const changed = instance.changed();

    if (changed.includes('collaboratorIds')) {
      const { collaboratorIds } = instance;
      const oldCollaboratorIds = instance.previous('collaboratorIds');

      // get all collaborators that are not in oldCollaboratorIds
      // and not the owner ID
      const newCollaboratorIds = collaboratorIds.filter(
        (id) => !oldCollaboratorIds.includes(id) && id !== instance.ownerId
      );

      if (newCollaboratorIds.length === 0) {
        return;
      }

      // imported inside function to prevent circular ref
      const { trCollaboratorAdded } = require('../../lib/mailer');

      // process notifications for new collaborators
      await Promise.all(newCollaboratorIds.map((id) => trCollaboratorAdded(instance, id)));
    }
  } catch (err) {
    auditLogger.error(`Error in notifyNewCollaborators: ${err}`);
  }
};

const notifyNewOwner = async (_sequelize, instance) => {
  try {
    // imported inside function to prevent circular ref
    const { trOwnerAdded } = require('../../lib/mailer');

    await trOwnerAdded(instance, instance.ownerId);
  } catch (err) {
    auditLogger.error(`Error in notifyNewOwner: ${err}`);
  }
};

const beforeValidate = async (_sequelize, instance) => {
  // Mirror before validation so the NOT NULL check on the column passes.
  mirrorEventId(instance);
};

const beforeUpdate = async (_sequelize, instance) => {
  purifyDataFields(instance, fieldsToEscape);
};

const beforeCreate = async (_sequelize, instance) => {
  purifyDataFields(instance, fieldsToEscape);
};

const afterUpdate = async (sequelize, instance, options) => {
  await notifyNewCollaborators(sequelize, instance, options);
};

const afterCreate = async (sequelize, instance, options) => {
  await notifyNewOwner(sequelize, instance);
};

export { afterCreate, afterUpdate, beforeCreate, beforeUpdate, beforeValidate };
