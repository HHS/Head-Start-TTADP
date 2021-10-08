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
      Grantee.hasMany(models.Grant, { as: 'grants', foreignKey: 'granteeId' });
    }
  }
  Grantee.init({
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: false,
    },
    granteeType: {
      type: DataTypes.STRING,
    },
  }, {
    sequelize,
    modelName: 'Grantee',
  });
  return Grantee;
};
