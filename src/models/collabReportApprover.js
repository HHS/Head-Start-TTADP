const { Model } = require('sequelize')
const { APPROVER_STATUSES } = require('@ttahub/common')
const { beforeCreate, beforeUpdate, afterCreate, afterDestroy, afterRestore, afterUpdate } = require('./hooks/collabReportApprover')

export default (sequelize, DataTypes) => {
  class CollabReportApprover extends Model {
    static associate(models) {
      CollabReportApprover.belongsTo(models.CollabReport, {
        foreignKey: 'collabReportId',
        as: 'collabReport',
      })
      CollabReportApprover.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      })
    }
  }

  CollabReportApprover.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      collabReportId: {
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
    },
    {
      hooks: {
        beforeCreate: async (instance) => beforeCreate(sequelize, instance),
        beforeUpdate: async (instance) => beforeUpdate(sequelize, instance),
        afterCreate: async (instance) => afterCreate(sequelize, instance),
        afterDestroy: async (instance) => afterDestroy(sequelize, instance),
        afterRestore: async (instance) => afterRestore(sequelize, instance),
        afterUpdate: async (instance) => afterUpdate(sequelize, instance),
      },
      indexes: [
        {
          unique: true,
          fields: ['collabReportId', 'userId'],
        },
      ],
      sequelize,
      modelName: 'CollabReportApprover',
      paranoid: true,
      timestamps: true, // enables createdAt and updatedAt
    }
  )

  return CollabReportApprover
}
