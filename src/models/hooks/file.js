/* eslint-disable import/prefer-default-export */
const { addDeleteFileToQueue } = require('../../services/s3Queue');
const { getSignedDownloadUrl } = require('../../lib/s3');

const setUrl = async (instance) => {
  const urlObject = await getSignedDownloadUrl(instance.key);
  instance.setDataValue('url', urlObject);
};

const setUrlOnFiles = async (sequelize, instance) => {
  // recursively check the result of a query for File instances and set the url
  // url is a virtual field which must be populated async
  if (!instance) return;

  if (instance instanceof sequelize.models.File) {
    setUrl(instance);
    return;
  }

  if (instance.dataValues) {
    await Promise.all(Object.values(instance.dataValues).map(async (value) => {
      if (Array.isArray(value)) {
        await Promise.all(value.map(setUrlOnFiles));
      } else if (value && typeof value === 'object') {
        await setUrlOnFiles(value);
      }
    }));
  }
};

const afterCreate = async (_sequelize, instance) => {
  await setUrl(instance);
};

const afterUpdate = async (_sequelize, instance) => {
  await setUrl(instance);
};

const afterFind = async (sequelize, instance) => {
  await setUrlOnFiles(sequelize, instance);
};

const afterDestroy = async (_sequelize, instance) => {
  // Add delete job S3 queue.
  await addDeleteFileToQueue(instance.id, instance.key);
};

export {
  setUrlOnFiles,
  afterCreate,
  afterUpdate,
  afterFind,
  afterDestroy,
};
