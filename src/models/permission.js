const {
  Model,
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Permission extends Model {
    static associate(models) {
    }
  }
  Permission.init({
    userId: DataTypes.INTEGER,
    regionId: DataTypes.INTEGER,
    scopeId: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'Permission',
    timestamps: false,
  });
  return Permission;
};
