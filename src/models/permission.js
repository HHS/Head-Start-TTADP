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
    regionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: {
          tableName: 'Regions',
        },
        key: 'id',
      },
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: {
          tableName: 'Users',
        },
        key: 'id',
      },
    },
    scopeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: {
          tableName: 'Scopes',
        },
        key: 'id',
      },
    },
  }, {
    sequelize,
    modelName: 'Permission',
  });
  return Permission;
};
