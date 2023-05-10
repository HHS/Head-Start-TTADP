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
  class SessionReport extends Model {
    static associate(models) {
      SessionReport.belongsTo(models.Report, { foreignKey: 'reportId', as: 'report' });
      SessionReport.belongsTo(models.Region, { foreignKey: 'regionId', as: 'region' });
    }
  }
  SessionReport.init({
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
    inpersonParticipants: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    virtualParticipants: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'SessionReport',
  });
  return SessionReport;
};
