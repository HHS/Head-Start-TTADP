const {
  Model,
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Grant extends Model {
    static associate(models) {
      Grant.belongsTo(models.Region, { foreignKey: 'regionId' });
      Grant.belongsTo(models.Grantee, { foreignKey: 'granteeId' });
      Grant.belongsToMany(models.Goal, { through: models.Ttaplan, foreignKey: 'grantId', as: 'goals' });
    }
  }
  Grant.init({
    number: DataTypes.STRING,
    status: DataTypes.STRING,
  }, {
    sequelize,
    modelName: 'Grant',
  });
  return Grant;
};
