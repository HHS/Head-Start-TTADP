const {
  Model,
  Op,
} = require('sequelize');
const {
  ENTITY_TYPE,
} = require('../constants');
const { automaticallyGenerateJunctionTableAssociations } = require('./helpers/associationsAndScopes');
const {
  beforeValidate,
  beforeUpdate,
  afterUpdate,
  afterCreate,
  beforeDestroy,
} = require('./hooks/reportObjectiveTemplate');

export default (sequelize, DataTypes) => {
  class ReportObjectiveTemplate extends Model {
    static async associate(models) {
      await automaticallyGenerateJunctionTableAssociations(this, models);
    }
  }
  ReportObjectiveTemplate.init({
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
    objectiveTemplateId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: {
          tableName: 'ObjectiveTemplates',
        },
        key: 'id',
      },
    },
    reportGoalTemplateId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: {
          tableName: 'ReportGoalTemplates',
        },
        key: 'id',
      },
    },
    supportTypeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: {
          tableName: 'SupportTypes',
        },
        key: 'id',
      },
    },
    templateTitle: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    ttaProvided: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    isActivelyEdited: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: true,
    },
    statusId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: {
          tableName: 'Statuses',
        },
        key: 'id',
      },
    },
    ordinal: {
      type: DataTypes.INTEGER,
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
    modelName: 'ReportObjectiveTemplate',
  });
  return ReportObjectiveTemplate;
};
