/* eslint-disable import/prefer-default-export */
const { addDeleteFileToQueue } = require('../../services/s3Queue');
const { getSignedDownloadUrl } = require('../../lib/s3');

const setUrl = async (instance) => {
  const signedUrl = await getSignedDownloadUrl(instance.key);
  instance.setDataValue('url', signedUrl);
};

const afterCreate = async (_sequelize, instance) => {
  await setUrl(instance);
};

const afterFind = async (_sequelize, instance) => {
  if (!instance) {
    return;
  }
  if (Array.isArray(instance)) {
    await Promise.all(instance.map((each) => setUrl(each)));
  } else {
    await setUrl(instance);
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
