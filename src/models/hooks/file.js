/* eslint-disable import/prefer-default-export */
const getS3QueueService = () => require('../../services/s3Queue'); // eslint-disable-line global-require
const afterDestroy = async (_sequelize, instance) => {
  const { addDeleteFileToQueue } = getS3QueueService();
  // Add delete job S3 queue.
  await addDeleteFileToQueue(instance.id, instance.key);
};

export {
  afterDestroy,
};
