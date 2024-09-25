const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class GrantReplacement extends Model {
    static associate(models) {
      GrantReplacement.belongsTo(models.GrantReplacementTypes, { foreignKey: 'grantReplacementTypeId', as: 'grantReplacementType' });
      GrantReplacement.belongsTo(models.Grant, { foreignKey: 'replacedGrantId', as: 'replacedGrant' });
      GrantReplacement.belongsTo(models.Grant, { foreignKey: 'replacingGrantId', as: 'replacingGrant' });

      models.Grant.hasMany(GrantReplacement, { foreignKey: 'replacedGrantId', as: 'replacedGrantReplacements' });
      models.Grant.hasMany(GrantReplacement, { foreignKey: 'replacingGrantId', as: 'replacingGrantReplacements' });
    }
  }

  GrantReplacement.init({
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

  return GrantReplacement;
};
