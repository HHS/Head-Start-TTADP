/* eslint-disable import/prefer-default-export */
const { addDeleteFileToQueue } = require('../../services/s3Queue')

const afterDestroy = async (_sequelize, instance) => {
  // Add delete job S3 queue.
  await addDeleteFileToQueue(instance.id, instance.key)
}

export { afterDestroy }
