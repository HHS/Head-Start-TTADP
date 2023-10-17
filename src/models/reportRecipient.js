const {
  Model,
} = require('sequelize');
const { REPORT_TYPE, RECIPIENT_TYPE } = require('../constants');
const { automaticallyGenerateJunctionTableAssociations } = require('./helpers/associationsAndScopes');

/**
 * Status table. Stores topics used in activity reports and tta plans.
 *
 * @param {} sequelize
 * @param {*} DataTypes
 */
export default (sequelize, DataTypes) => {
  class ReportRecipient extends Model {
    static async associate(models) {
      await automaticallyGenerateJunctionTableAssociations(this, models);

      ReportRecipient.addScope('defaultScope', {
        include: [
          { model: models.Grant, as: 'grant', attributes: [] },
          { model: models.OtherEntity, as: 'otherEntity', attributes: [] },
        ],
      });
    }
  }
  ReportRecipient.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    reportId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: {
          tableName: 'Reports',
        },
        key: 'id',
      },
    },
    grantId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: {
          tableName: 'Grants',
        },
        key: 'id',
      },
    },
    otherEntityId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: {
          tableName: 'OtherEntities',
        },
        key: 'id',
      },
    },
    recipientId: {
      type: DataTypes.VIRTUAL,
      get() {
        if (this.grantId) {
          return this.grantId;
        }
        return this.otherEntityId;
      },
    },
    name: {
      type: DataTypes.VIRTUAL,
      get() {
        if (this.grant) {
          return this.grant.name;
        }
        if (this.otherEntity) {
          return this.otherEntity.name;
        }
        return null;
      },
    },
    recipientType: {
      type: DataTypes.VIRTUAL,
      get() {
        if (this.grantId) return RECIPIENT_TYPE.GRANT;
        if (this.otherEntityId) return RECIPIENT_TYPE.OTHER_ENTITY;
        return null;
      },
    },
  }, {
    sequelize,
    modelName: 'ReportRecipient',
  });
  return ReportRecipient;
};
