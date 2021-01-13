const {
  Model,
} = require('sequelize');

/**
 * Grantees table. Stores grantees.
 *
 * @param {} sequelize
 * @param {*} DataTypes
 */
module.exports = (sequelize, DataTypes) => {
  class Grantee extends Model {
    static associate(models) {
      Grantee.belongsToMany(models.Goal, { through: models.GrantGoal, foreignKey: 'granteeId', as: 'goals' });
    }
  }
  Grantee.init({
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: false,
    },
  }, {
    sequelize,
    modelName: 'Grantee',
  });
  return Grantee;
};
