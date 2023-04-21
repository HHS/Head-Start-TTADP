/* eslint-disable import/prefer-default-export */
const { deleteFileJob } = require('../../lib/s3QueueManager');

const afterDestroy = async (sequelize, instance, options) => {
  // Add delete job S3 queue.
  deleteFileJob(instance.key, instance.id);
};

export {
  afterDestroy,
};
