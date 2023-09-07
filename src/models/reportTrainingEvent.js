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

export default (sequelize, DataTypes) => {
  class ReportTrainingEvent extends Model {
    static associate(models) {
      automaticallyGenerateJunctionTableAssociations(this, models);
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
    audience: {
      type: DataTypes.ARRAY(DataTypes.ENUM(Object.values(AUDIENCE))),
      allowNull: false,
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
    sequelize,
    modelName: 'ReportTrainingEvent',
  });
  return ReportTrainingEvent;
};
