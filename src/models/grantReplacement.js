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
    replacedGrantId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    replacingGrantId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    grantReplacementTypeId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    replacementDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'GrantReplacements',
  });

  return GrantReplacement;
};
