const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class GrantReplacement extends Model {
    static associate(models) {
      GrantReplacement.belongsTo(models.GrantReplacementTypes, { foreignKey: 'grantReplacementTypeId' });
      GrantReplacement.belongsTo(models.Grant, { foreignKey: 'replacedGrantId' });
      GrantReplacement.belongsTo(models.Grant, { foreignKey: 'replacingGrantId' });

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
    modelName: 'GrantReplacement',
  });

  return GrantReplacement;
};
