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
      NationalCenter.belongsTo(models.NationalCenter, {
        foreignKey: 'mapsTo',
        as: 'mapsToNationalCenter',
      });
      NationalCenter.hasMany(models.NationalCenter, {
        foreignKey: 'mapsTo',
        as: 'mapsFromNationalCenters',
      });
      NationalCenter.hasMany(models.ReportNationalCenter, {
        foreignKey: 'nationalCenterId',
        as: 'reportNationalCanter',
      });
      NationalCenter.belongsToMany(models.Report, {
        through: models.ReportNationalCenter,
        foreignKey: 'nationalCenterId',
        otherKey: 'reportId',
        as: 'reports',
      });

      models.NationalCenter.addScope('defaultScope', {
        include: [{
          model: models.NationalCenter,
          as: 'mapsToNationalCenter',
          required: false,
        }],
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
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true,
    },
    mapsTo: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    latestName: {
      type: DataTypes.VIRTUAL(DataTypes.STRING),
      get() {
        return this.get('mapsTo')
          ? this.get('mapsToNationalCenter').get('name')
          : this.get('name');
      },
    },
    latestId: {
      type: DataTypes.VIRTUAL(DataTypes.INTEGER),
      get() {
        return this.get('mapsTo')
          ? this.get('mapsToNationalCenter').get('id')
          : this.get('id');
      },
    },
  }, {
    sequelize,
    modelName: 'NationalCenter',
    paranoid: true,
  });
  return NationalCenter;
};
