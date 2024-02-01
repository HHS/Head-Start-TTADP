import {
  syncGrantNumberLink,
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

export {
  afterCreate,
  afterUpdate,
};
