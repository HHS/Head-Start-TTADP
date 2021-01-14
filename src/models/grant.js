const {
  Model,
} = require('sequelize');

/**
 * Grants table. Stores grants.
 *
 * @param {} sequelize
 * @param {*} DataTypes
 */
module.exports = (sequelize, DataTypes) => {
  class Grant extends Model {
    static associate(models) {
      Grant.belongsTo(models.Region, { foreignKey: 'regionId' });
      Grant.belongsTo(models.Grantee, { foreignKey: 'granteeId', as: 'grantee' });
      Grant.belongsToMany(models.Goal, { through: models.GrantGoal, foreignKey: 'grantId', as: 'goals' });
    }
  }
  Grant.init({
    number: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    status: DataTypes.STRING,
    startDate: DataTypes.DATE,
    endDate: DataTypes.DATE,
    granteeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    name: {
      type: DataTypes.VIRTUAL,
      get() {
        return `${this.grantee.name} - ${this.number}`;
      },
    },
  }, {
    sequelize,
    modelName: 'Grant',
  });
  return Grant;
};
