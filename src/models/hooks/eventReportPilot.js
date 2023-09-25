/* eslint-disable import/prefer-default-export */

const notifyNewCollaborators = async (_sequelize, instance) => {
  const changed = instance.changed();
  if (Array.isArray(changed) && changed.includes('collaboratorIds')) {
    const { collaboratorIds } = instance;
    const oldCollaboratorIds = instance.previous('collaboratorIds');

    // get all collaborators that are not in oldCollaboratorIds
    // and not the owner ID
    const newCollaboratorIds = collaboratorIds.filter((id) => (
      !oldCollaboratorIds.includes(id) && id !== instance.ownerId));

    if (newCollaboratorIds.length === 0) {
      return;
    }

    // eslint-disable-next-line global-require
    const { trCollaboratorAdded } = require('../../lib/mailer');

    // process notifications for new collaborators
    await Promise.all(
      newCollaboratorIds.map((id) => trCollaboratorAdded(instance, id)),
    );
  }
};

const notifyPocEventComplete = async (sequelize, instance, options) => {};

const notifyVisionAndGoalComplete = async (sequelize, instance, options) => {};

const afterUpdate = async (sequelize, instance, options) => {
  await notifyNewCollaborators(sequelize, instance, options);
  await notifyPocEventComplete(sequelize, instance, options);
  await notifyVisionAndGoalComplete(sequelize, instance, options);
};

export {
  afterUpdate,
};
