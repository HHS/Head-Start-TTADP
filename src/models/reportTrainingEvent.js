const {
  Model,
  Op,
} = require('sequelize');
const {
  REPORT_TYPE,
  TRAINING_TYPE,
  AUDIENCE,
  ORGANIZER,
} = require('../constants');
const { automaticallyGenerateJunctionTableAssociations } = require('./helpers/associationsAndScopes');
const {
  beforeValidate,
  beforeUpdate,
  afterUpdate,
  afterCreate,
  beforeDestroy,
} = require('./hooks/reportTrainingEvent');

export default (sequelize, DataTypes) => {
  class ReportTrainingEvent extends Model {
    static async associate(models) {
      await automaticallyGenerateJunctionTableAssociations(this, models);
    }
  }
  ReportTrainingEvent.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
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
    regionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: {
          tableName: 'Regions',
        },
        key: 'id',
      },
    },
    eventId: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    organizerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: {
          tableName: 'Organizers',
        },
        key: 'id',
      },
    },
    trainingType: {
      type: DataTypes.ENUM(Object.values(TRAINING_TYPE)),
      allowNull: false,
      defaultValue: sequelize.literal(`'${TRAINING_TYPE.SERIES}'::"enum_ReportTrainingEvents_trainingType"`),
    },
    vision: {
      type: DataTypes.TEXT,
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
    modelName: 'ReportTrainingEvent',
  });
  return ReportTrainingEvent;
};
