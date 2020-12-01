const {
  Model,
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Ttaplan extends Model {
    static associate() {
    }
  }
  Ttaplan.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    grant: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'Ttaplan',
  });
  return Ttaplan;
};
