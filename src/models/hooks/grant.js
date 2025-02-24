import {
  syncGrantNumberLink,
  clearGrantNumberLink,
} from './genericLink';

const afterCreate = async (sequelize, instance, options) => {
  await Promise.all([
    syncGrantNumberLink(sequelize, instance, options, 'number'),
    sequelize.models.GrantRelationshipToActive.refresh(),
  ]);
};

const checkStatusChangeAndRefresh = async (sequelize, instance) => {
  if (instance.changed('status')) {
    await sequelize.models.GrantRelationshipToActive.refresh();
  }
};

const afterUpdate = async (sequelize, instance, options) => {
  await Promise.all([
    syncGrantNumberLink(sequelize, instance, options, 'number'),
    checkStatusChangeAndRefresh(sequelize, instance),
  ]);
};

const beforeDestroy = async (sequelize, instance, options) => {
  await Promise.all([
    clearGrantNumberLink(sequelize, instance, options),
  ]);
};

const afterDestroy = async (sequelize, instance, options) => {
  await sequelize.models.GrantRelationshipToActive.refresh();
};

export {
  afterCreate,
  afterUpdate,
  beforeDestroy,
  afterDestroy,
};
