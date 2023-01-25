const { Model } = require('sequelize');
const {
  afterCreate,
  afterDestroy,
  afterRestore,
  afterUpdate,
  afterUpsert,
} = require('./hooks/activityReportApprover');
const { APPROVER_STATUSES } = require('../constants');

export default (sequelize, DataTypes) => {
  class ActivityReportApprover extends Model {
    static associate(models) {
      ActivityReportApprover.belongsTo(models.ActivityReport, { foreignKey: 'activityReportId', as: 'activityReport' });
      ActivityReportApprover.belongsTo(models.User, { foreignKey: 'userId' });
    }
  }
  ActivityReportApprover.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    activityReportId: {
      allowNull: false,
      type: DataTypes.INTEGER,
    },
    userId: {
      allowNull: false,
      type: DataTypes.INTEGER,
    },
    status: {
      allowNull: true,
      type: DataTypes.ENUM(Object.keys(APPROVER_STATUSES).map((k) => APPROVER_STATUSES[k])),
    },
    note: {
      allowNull: true,
      type: DataTypes.TEXT,
    },
  }, {
    hooks: {
      afterCreate: async (instance) => afterCreate(sequelize, instance),
      afterDestroy: async (instance) => afterDestroy(sequelize, instance),
      afterRestore: async (instance) => afterRestore(sequelize, instance),
      afterUpdate: async (instance) => afterUpdate(sequelize, instance),
      afterUpsert: async (instance) => afterUpsert(sequelize, instance),
    },
    indexes: [{
      unique: true,
      fields: ['activityReportId', 'userId'],
    }],
    sequelize,
    paranoid: true,
    modelName: 'ActivityReportApprover',
  });
  return ActivityReportApprover;
};
