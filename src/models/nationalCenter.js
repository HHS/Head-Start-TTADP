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
  class NationalCenter extends Model {
    static associate(models) {
      NationalCenter.hasMany(models.ReportNationalCenter, { foreignKey: 'nationalCenterId', as: 'reportNationalCanter' });
      NationalCenter.belongsToMany(models.Report, {
        through: models.ReportNationalCenter,
        foreignKey: 'nationalCenterId',
        otherKey: 'reportId',
        as: 'reports',
      });
    }
  }
  NationalCenter.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    mapsTo: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'NationalCenter',
    paranoid: true,
  });
  return NationalCenter;
};
