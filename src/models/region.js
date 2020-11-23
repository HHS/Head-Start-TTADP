const {
  Model,
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Region extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Region.hasMany(models.User, {
        foreignKey: {
          name: 'homeRegionId',
          allowNull: false,
        },
      });
      Region.belongsToMany(models.Scope, { through: models.Permission, foreignKey: 'regionId', timestamps: false });
    }
  }
  Region.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'Region',
    timestamps: false,
  });
  return Region;
};
