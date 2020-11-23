const {
  Model,
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Permission extends Model {
    static associate() {
    }
  }
  Permission.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
  }, {
    sequelize,
    modelName: 'Permission',
  });
  return Permission;
};
