import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class GrantDeliveredReview extends Model {
    static associate(models) {
      // TODO: Add associations
    }
  }
  GrantDeliveredReview.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    // TODO: Add columns and foreign keys
  }, {
    sequelize,
    modelName: 'GrantDeliveredReview',
    tableName: 'GrantDeliveredReviews',
  });
  return GrantDeliveredReview;
};
