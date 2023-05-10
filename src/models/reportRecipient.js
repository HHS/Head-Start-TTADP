const {
  Model,
} = require('sequelize');
const { RECIPIENT_TYPE } = require('../constants');

/**
 * Status table. Stores topics used in activity reports and tta plans.
 *
 * @param {} sequelize
 * @param {*} DataTypes
 */
export default (sequelize, DataTypes) => {
  class ReportRecipient extends Model {
    static associate(models) {
      ReportRecipient.belongsTo(models.Report, { foreignKey: 'reportId', as: 'report' });
      ReportRecipient.belongsTo(models.Grant, { foreignKey: 'grantId', as: 'grant' });
      ReportRecipient.belongsTo(models.OtherEntity, { foreignKey: 'otherEntityId', as: 'otherEntity' });

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
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    reportId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    grantId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    otherEntityId: {
      type: DataTypes.INTEGER,
      allowNull: true,
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
