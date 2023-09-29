const {
  Model,
  Op,
} = require('sequelize');
const { ENTITY_TYPE } = require('../constants');
const { automaticallyGenerateJunctionTableAssociations } = require('./helpers/associationsAndScopes');
const {
  beforeValidate,
  beforeUpdate,
  afterUpdate,
  afterCreate,
  beforeDestroy,
} = require('./hooks/reportGoalTemplate');

export default (sequelize, DataTypes) => {
  class ReportGoalTemplate extends Model {
    static associate(models) {
      automaticallyGenerateJunctionTableAssociations(this, models);
    }
  }
  ReportGoalTemplate.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.BIGINT,
    },
    reportId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: {
          tableName: 'Reports',
        },
        key: 'id',
      },
    },
    goalTemplateId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: {
          tableName: 'GoalTemplates',
        },
        key: 'id',
      },
    },
    templateName: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    timeframe: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    endDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    isActivelyEdited: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: true,
    },
  }, {
    hooks: {
      beforeValidate: async (instance, options) => beforeValidate(sequelize, instance, options),
      afterCreate: async (instance, options) => afterCreate(sequelize, instance, options),
      beforeUpdate: async (instance, options) => beforeUpdate(sequelize, instance, options),
      afterUpdate: async (instance, options) => afterUpdate(sequelize, instance, options),
      beforeDestroy: async (instance, options) => afterUpdate(sequelize, instance, options),
    },
    sequelize,
    modelName: 'ReportGoalTemplate',
  });
  return ReportGoalTemplate;
};
