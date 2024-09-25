const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class GrantReplacementTypes extends Model {
    static associate(models) {
      GrantReplacementTypes.hasMany(models.GrantReplacements, { foreignKey: 'grantReplacementTypeId', as: 'grantReplacementType' });
    }
  }

  GrantReplacementTypes.init({
    name: DataTypes.TEXT,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
    deletedAt: DataTypes.DATE,
    mapsTo: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'GrantReplacementTypes',
  });

  return GrantReplacementTypes;
};
