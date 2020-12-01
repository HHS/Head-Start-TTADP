const {
  Model,
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class RoleTopic extends Model {
    static associate() {
    }
  }
  RoleTopic.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
  }, {
    sequelize,
    modelName: 'RoleTopic',
  });
  return RoleTopic;
};
