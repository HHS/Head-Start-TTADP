import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class DeliveredReviewCitation extends Model {
    static associate(models) {
      models.DeliveredReviewCitation.belongsTo(models.DeliveredReview, {
        foreignKey: 'deliveredReviewId',
        as: 'deliveredReview',
      });
      models.DeliveredReviewCitation.belongsTo(models.Citation, {
        foreignKey: 'citationId',
        as: 'citation',
      });
    }
  }
  DeliveredReviewCitation.init(
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
      },
      deliveredReviewId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'DeliveredReviews',
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
      determination: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      latest_review_start: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      latest_review_end: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'DeliveredReviewCitation',
      tableName: 'DeliveredReviewCitations',
    }
  );
  return DeliveredReviewCitation;
};
