import {
  syncGrantNumberLink,
  clearGrantNumberLink,
} from './genericLink';

const afterCreate = async (sequelize, instance, options) => {
  await Promise.all([
    syncGrantNumberLink(sequelize, instance, options, 'number'),
  ]);
};

const afterUpdate = async (sequelize, instance, options) => {
  await Promise.all([
    syncGrantNumberLink(sequelize, instance, options, 'number'),
  ]);
};

const beforeDestroy = async (sequelize, instance, options) => {
  await Promise.all([
    clearGrantNumberLink(sequelize, instance, options),
  ]);
};

export {
  afterCreate,
  afterUpdate,
  beforeDestroy,
};
