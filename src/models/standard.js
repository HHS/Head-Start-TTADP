// See docs/monitoring-fact-tables.md for column definitions and business rules.
import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class Standard extends Model {
    static associate(models) {
      models.Standard.belongsTo(models.Citation, {
        foreignKey: 'citationId',
        as: 'citation',
      });
    }
  }
  Standard.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    citationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    guidance_category: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'Standard',
    tableName: 'Standards',
  });
  return Standard;
};
