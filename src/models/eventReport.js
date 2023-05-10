const {
  Model,
} = require('sequelize');
const {
  TRAINING_TYPE,
  AUDIENCE,
  ORGANIZER,
} = require('../constants');

/**
 * Status table. Stores topics used in activity reports and tta plans.
 *
 * @param {} sequelize
 * @param {*} DataTypes
 */
export default (sequelize, DataTypes) => {
  class EventReport extends Model {
    static associate(models) {
      EventReport.belongsTo(models.Report, { foreignKey: 'reportId', as: 'report' });
      EventReport.belongsTo(models.Region, { foreignKey: 'regionId', as: 'region' });
    }
  }
  EventReport.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    reportId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    regionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true,
    },
    organizer: {
      type: DataTypes.ENUM(Object.values(ORGANIZER)),
      allowNull: false,
    },
    audience: {
      type: DataTypes.ARRAY(DataTypes.ENUM(Object.values(AUDIENCE))),
      allowNull: false,
    },
    trainingType: {
      type: DataTypes.ENUM(Object.values(TRAINING_TYPE)),
      allowNull: false,
      defaultValue: TRAINING_TYPE.SERIES,
    },
    vision: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'EventReport',
  });
  return EventReport;
};
