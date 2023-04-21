/* eslint-disable import/prefer-default-export */
const { addDeleteFileToQueue } = require('../../services/s3Queue');

const afterDestroy = async (sequelize, instance, options) => {
  // Add delete job S3 queue.
  await addDeleteFileToQueue(instance.key, instance.id);
};

export {
  afterDestroy,
};
