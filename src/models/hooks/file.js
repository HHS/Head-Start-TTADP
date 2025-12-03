/* eslint-disable import/prefer-default-export */
const { addDeleteFileToQueue } = require('../../services/s3Queue');
const { getSignedDownloadUrl } = require('../../lib/s3');

const setUrl = async (instance) => {
  const url = await getSignedDownloadUrl(instance.key);
  instance.setDataValue('url', url.url);
};

const afterCreate = async (_sequelize, instance) => {
  setUrl(instance);
};

const afterFind = async (_sequelize, instance) => {
  if (Array.isArray(instance)) {
    instance.forEach((each) => {
      setUrl(each);
    });
  } else {
    setUrl(instance);
  }
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
