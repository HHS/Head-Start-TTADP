/* eslint-disable import/prefer-default-export */
const { cleanupOrphanResources } = require('../helpers/orphanCleanupHelper');

const afterDestroy = async (sequelize, instance, options) => {
  cleanupOrphanResources(sequelize, instance.resourceId);
};

export {
  afterDestroy,
};
