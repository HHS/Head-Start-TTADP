import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class GrantCitation extends Model {
    static associate(models) {
      // TODO: Add associations
    }
  }
  GrantCitation.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    // TODO: Add columns and foreign keys
  }, {
    sequelize,
    modelName: 'GrantCitation',
    tableName: 'GrantCitations',
  });
  return GrantCitation;
};
