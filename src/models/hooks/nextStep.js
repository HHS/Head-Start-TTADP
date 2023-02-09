const { calculateIsAutoDetectedForNextStep, processNextStepForResourcesById } = require('../../services/resource');

const processForEmbeddedResources = async (sequelize, instance, options) => {
  const changed = instance.changed() || Object.keys(instance);
  if (calculateIsAutoDetectedForNextStep(changed)) {
    await processNextStepForResourcesById(instance.id);
  }
};

const afterCreate = async (sequelize, instance, options) => {
  await processForEmbeddedResources(sequelize, instance, options);
};

const afterUpdate = async (sequelize, instance, options) => {
  await processForEmbeddedResources(sequelize, instance, options);
};

export {
  processForEmbeddedResources,
  afterCreate,
  afterUpdate,
};
