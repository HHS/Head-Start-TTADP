const { Model } = require('sequelize');
const { TTA_REQUEST_ORIGINATORS, TTA_REQUEST_STATUSES } = require('@ttahub/common');

/**
 * A TTA request, created by a TTA Request Creator and saved as a draft until it is
 * submitted for review. Goals are only created from a request when it is approved.
 */
export default (sequelize, DataTypes) => {
  class TtaRequest extends Model {
    static associate(models) {
      TtaRequest.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'creator',
      });
      TtaRequest.belongsTo(models.User, {
        foreignKey: 'lastUpdatedById',
        as: 'lastUpdatedBy',
      });
      TtaRequest.belongsTo(models.User, {
        foreignKey: 'reviewerId',
        as: 'reviewer',
      });
      TtaRequest.belongsTo(models.Region, {
        foreignKey: 'regionId',
        as: 'region',
      });
      TtaRequest.belongsTo(models.Recipient, {
        foreignKey: 'recipientId',
        as: 'recipient',
      });
      TtaRequest.belongsTo(models.GoalTemplate, {
        foreignKey: 'goalTemplateId',
        as: 'goalTemplate',
      });
      TtaRequest.hasMany(models.TtaRequestGrant, {
        foreignKey: 'ttaRequestId',
        as: 'requestGrants',
      });
      TtaRequest.belongsToMany(models.Grant, {
        through: models.TtaRequestGrant,
        foreignKey: 'ttaRequestId',
        otherKey: 'grantId',
        as: 'grants',
      });
      TtaRequest.hasMany(models.TtaRequestCitation, {
        foreignKey: 'ttaRequestId',
        as: 'citations',
      });
    }
  }

  TtaRequest.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      lastUpdatedById: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      regionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      recipientId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      recipientAware: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
      },
      originator: {
        type: DataTypes.ENUM(TTA_REQUEST_ORIGINATORS),
        allowNull: true,
      },
      goalTemplateId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      context: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      creatorNotes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      reviewerId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM(Object.values(TTA_REQUEST_STATUSES)),
        allowNull: false,
        defaultValue: TTA_REQUEST_STATUSES.DRAFT,
      },
      displayId: {
        type: DataTypes.VIRTUAL,
        get() {
          if (!this.regionId) {
            return this.id;
          }
          return `R${this.regionId.toString().padStart(2, '0')}-REQ-${this.id}`;
        },
      },
    },
    {
      sequelize,
      modelName: 'TtaRequest',
      tableName: 'TtaRequests',
      paranoid: true,
      timestamps: true,
    }
  );

  return TtaRequest;
};
