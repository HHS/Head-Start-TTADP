const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class Foiaable extends Model {
    static associate(models) {
    }
  }
  Foiaable.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    table: {
      allowNull: false,
      type: DataTypes.TEXT,
    },
    column: {
      allowNull: false,
      type: DataTypes.TEXT,
    },
  }, {
    sequelize,
    modelName: 'Foiaable',
    tableName: 'Foiaable',
  });
  return Foiaable;
};
