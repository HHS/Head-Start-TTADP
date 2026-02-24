import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class GrantCitation extends Model {
    static associate(models) {
      models.GrantCitation.belongsTo(models.Grant, {
        foreignKey: 'grantId',
        as: 'grant',
      });
      models.GrantCitation.belongsTo(models.Citation, {
        foreignKey: 'citationId',
        as: 'citation',
      });
    }
  }
  GrantCitation.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    grantId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Grants',
        key: 'id',
      },
    },
    citationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Citations',
        key: 'id',
      },
    },
  }, {
    sequelize,
    modelName: 'GrantCitation',
    tableName: 'GrantCitations',
  });
  return GrantCitation;
};
