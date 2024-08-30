const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class GrantReplacements extends Model {
    static associate(models) {
      GrantReplacements.belongsTo(models.GrantReplacementTypes, { foreignKey: 'grantReplacementTypeId' });
      GrantReplacements.belongsTo(models.Grant, { foreignKey: 'replacedGrantId' });
      GrantReplacements.belongsTo(models.Grant, { foreignKey: 'replacingGrantId' });

      models.Grant.hasMany(GrantReplacements, { foreignKey: 'replacedGrantId', as: 'replacedGrantReplacements' });
      models.Grant.hasMany(GrantReplacements, { foreignKey: 'replacingGrantId', as: 'replacingGrantReplacements' });
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
