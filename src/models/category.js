// See docs/monitoring-fact-tables.md for column definitions and business rules.
import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class Category extends Model {
    static associate(models) {
      models.Category.hasMany(models.Citation, {
        foreignKey: 'categoryId',
        as: 'citations',
      });
    }
  }
  Category.init({
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
  }, {
    sequelize,
    modelName: 'Category',
    tableName: 'Categories',
    paranoid: true,
  });
  return Category;
};
