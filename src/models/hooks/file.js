/* eslint-disable import/prefer-default-export */
const { addDeleteFileToQueue } = require('../../services/s3Queue');
const { getSignedDownloadUrl } = require('../../lib/s3');

const afterCreate = async (_sequelize, instance) => {
  instance.setDataValue('url', await getSignedDownloadUrl(instance.key));
};

const afterFind = async (_sequelize, instance) => {
  instance.setDataValue('url', await getSignedDownloadUrl(instance.key));
};

const afterDestroy = async (_sequelize, instance) => {
  // Add delete job S3 queue.
  await addDeleteFileToQueue(instance.id, instance.key);
};

export {
  afterCreate,
  afterFind,
  afterDestroy,
};
