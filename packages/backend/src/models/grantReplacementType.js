const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class GrantReplacementTypes extends Model {
    static associate(models) {
      GrantReplacementTypes.hasMany(models.GrantReplacements, { foreignKey: 'grantReplacementTypeId', as: 'grantReplacements' });
      GrantReplacementTypes.hasMany(models.GrantReplacementTypes, {
        foreignKey: 'mapsTo',
        as: 'mapsFromReplacementType',
      });
      GrantReplacementTypes.belongsTo(models.GrantReplacementTypes, {
        foreignKey: 'mapsTo',
        as: 'mapsToReplacementType',
      });
    }
  }

  GrantReplacementTypes.init({
    name: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    deletedAt: DataTypes.DATE,
    mapsTo: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'GrantReplacementTypes',
  });

  return GrantReplacementTypes;
};
