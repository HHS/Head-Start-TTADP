const {
  Model,
} = require('sequelize');

/**
 * GrantGoal table. Junction table between Grants and Goals to support many to many relationship.
 *
 * @param {} sequelize
 * @param {*} DataTypes
 */
module.exports = (sequelize, DataTypes) => {
  class GrantGoal extends Model {
    static associate() {
    }
  }
  GrantGoal.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
  }, {
    sequelize,
    modelName: 'GrantGoal',
  });
  return GrantGoal;
};
