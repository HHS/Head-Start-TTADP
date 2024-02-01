import {
  syncMonitoringReviewLink,
} from './genericLink';

const beforeCreate = async (sequelize, instance, options) => {
  await Promise.all([
    syncMonitoringReviewLink(sequelize, instance, options),
  ]);
};

const beforeUpdate = async (sequelize, instance, options) => {
  await Promise.all([
    syncMonitoringReviewLink(sequelize, instance, options),
  ]);
};

export {
  beforeCreate,
  beforeUpdate,
};
