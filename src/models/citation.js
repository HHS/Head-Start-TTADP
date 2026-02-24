import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class Citation extends Model {
    static associate(models) {
      // TODO: Add associations
    }
  }
  Citation.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    // TODO: Add columns
  }, {
    sequelize,
    modelName: 'Citation',
    tableName: 'Citations',
  });
  return Citation;
};
