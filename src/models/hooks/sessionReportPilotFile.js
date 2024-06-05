/* eslint-disable import/prefer-default-export */
const { cleanupOrphanFiles } = require('../helpers/orphanCleanupHelper');

const afterDestroy = async (sequelize, instance, options) => {
  await cleanupOrphanFiles(sequelize, instance.fileId);
};

export {
  afterDestroy,
};
