const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class GrantReplacements extends Model {
    static associate(models) {
      GrantReplacements.belongsTo(models.GrantReplacementTypes, { foreignKey: 'grantReplacementTypeId' });
      GrantReplacements.belongsTo(models.Grant, { foreignKey: 'replacedGrantId' });
      GrantReplacements.belongsTo(models.Grant, { foreignKey: 'replacingGrantId' });
    }
  }

  GrantReplacements.init({
    replacedGrantId: DataTypes.INTEGER,
    replacingGrantId: DataTypes.INTEGER,
    grantReplacementTypeId: DataTypes.INTEGER,
    replacementDate: DataTypes.DATE,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  }, {
    sequelize,
    modelName: 'GrantReplacements',
  });

  return GrantReplacements;
};
