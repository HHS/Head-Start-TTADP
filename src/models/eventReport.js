const {
  Model,
} = require('sequelize');

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
      type: DataTypes.ENUM([ // TODO: verify enum values
        'Regional w/NC',
        'Regional w/o NC',
        'IST',
      ]),
      allowNull: false,
    },
    audience: {
      type: DataTypes.ARRAY(DataTypes.ENUM(['Recipients', 'TTA specialists', 'Federal staff'])),
      allowNull: false,
    },
    trainingType: { }, // TODO: don't know what this is yet.
    vision: { }, // TODO: don't know what this is yet.
  }, {
    sequelize,
    modelName: 'EventReport',
  });
  return EventReport;
};
