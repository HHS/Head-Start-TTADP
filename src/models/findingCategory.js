// See docs/monitoring-fact-tables.md for column definitions and business rules.
import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class FindingCategory extends Model {
    static associate(models) {
      models.FindingCategory.hasMany(models.Citation, {
        foreignKey: 'findingCategoryId',
        as: 'citations',
      });
    }
  }
  FindingCategory.init(
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.TEXT,
        allowNull: false,
        unique: true,
      },
    },
    {
      sequelize,
      modelName: 'FindingCategory',
      tableName: 'FindingCategories',
      paranoid: true,
    }
  );
  return FindingCategory;
};
