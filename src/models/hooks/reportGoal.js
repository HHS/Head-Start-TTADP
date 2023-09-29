import {
  processForResources,
  cleanupResources,
} from '../helpers/reportResources';

const beforeValidate = async (sequelize, instance, options) => {
};

const beforeUpdate = async (sequelize, instance, options) => {
};

const afterUpdate = async (sequelize, instance, options) => {
  await processForResources(sequelize, instance, options);
};

const afterCreate = async (sequelize, instance, options) => {
  await processForResources(sequelize, instance, options);
};

const beforeDestroy = async (sequelize, instance, options) => {
  await cleanupResources(sequelize, instance, options);
};

export {
  beforeValidate,
  beforeUpdate,
  afterUpdate,
  afterCreate,
  beforeDestroy,
};
