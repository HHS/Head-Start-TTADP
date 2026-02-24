import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class DeliveredReview extends Model {
    static associate(models) {
      // TODO: Add associations
    }
  }
  DeliveredReview.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    // TODO: Add columns
  }, {
    sequelize,
    modelName: 'DeliveredReview',
    tableName: 'DeliveredReviews',
  });
  return DeliveredReview;
};
