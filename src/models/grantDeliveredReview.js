import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class GrantDeliveredReview extends Model {
    static associate(models) {
      models.GrantDeliveredReview.belongsTo(models.Grant, {
        foreignKey: 'grantId',
        as: 'grant',
      });
      models.GrantDeliveredReview.belongsTo(models.DeliveredReview, {
        foreignKey: 'deliveredReviewId',
        as: 'deliveredReview',
      });
    }
  }
  GrantDeliveredReview.init({
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
    deliveredReviewId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'DeliveredReviews',
        key: 'id',
      },
    },
  }, {
    sequelize,
    modelName: 'GrantDeliveredReview',
    tableName: 'GrantDeliveredReviews',
  });
  return GrantDeliveredReview;
};
