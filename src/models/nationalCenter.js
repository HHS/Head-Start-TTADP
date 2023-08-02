const {
  Model,
} = require('sequelize');
const { afterDestroy, afterUpdate } = require('./hooks/nationalCenter');

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
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notNull: true,
        notEmpty: true,
      },
      unique: true,
    },
    mapsTo: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      references: {
        model: {
          tableName: 'NationalCenters',
        },
        key: 'id',
      },
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
    hooks: {
      afterUpdate: async (instance, options) => afterUpdate(sequelize, instance, options),
      afterDestroy: async (instance, options) => afterDestroy(sequelize, instance, options),
    },
    paranoid: true,
  });
  return NationalCenter;
};
