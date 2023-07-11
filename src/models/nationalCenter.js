const { Model } = require('sequelize');
const { afterDestroy } = require('./hooks/nationalCenter');

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
      type: DataTypes.STRING,
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
    paranoid: true,
    sequelize,
    hooks: {
      afterDestroy: async (instance) => afterDestroy(sequelize, instance),
    },
    modelName: 'NationalCenter',
  });
  return NationalCenter;
};
