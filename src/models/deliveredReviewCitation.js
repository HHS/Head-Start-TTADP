import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class DeliveredReviewCitation extends Model {
    static associate(models) {
      // TODO: Add associations
    }
  }
  DeliveredReviewCitation.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    // TODO: Add columns and foreign keys
  }, {
    sequelize,
    modelName: 'DeliveredReviewCitation',
    tableName: 'DeliveredReviewCitations',
  });
  return DeliveredReviewCitation;
};
