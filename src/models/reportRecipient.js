const {
  Model,
} = require('sequelize');
const { ENTITY_TYPE, RECIPIENT_TYPE } = require('../constants');

/**
 * Status table. Stores topics used in activity reports and tta plans.
 *
 * @param {} sequelize
 * @param {*} DataTypes
 */
export default (sequelize, DataTypes) => {
  class ReportRecipient extends Model {
    static associate(models) {
      ReportRecipient.belongsTo(models.Report, {
        foreignKey: 'reportId',
        as: 'report',
      });
      ReportRecipient.belongsTo(models.Grant, { foreignKey: 'grantId', as: 'grant' });
      ReportRecipient.belongsTo(models.OtherEntity, { foreignKey: 'otherEntityId', as: 'otherEntity' });

      ReportRecipient.addScope('defaultScope', {
        include: [
          { model: models.Grant, as: 'grant', attributes: [] },
          { model: models.OtherEntity, as: 'otherEntity', attributes: [] },
        ],
      });

      models.Report.scope(ENTITY_TYPE.REPORT_SESSION).hasMany(models.ReportRecipient, {
        foreignKey: 'reportId',
        as: 'reportRecipient',
      });

      models.Grant.hasMany(models.ReportRecipient, {
        foreignKey: 'grantId',
        as: 'reportRecipient',
      });

      models.OtherEntity.hasMany(models.ReportRecipient, {
        foreignKey: 'otherEntityId',
        as: 'reportRecipient',
      });

      models.Report.scope(ENTITY_TYPE.REPORT_SESSION)
        .belongsToMany(models.Grant, {
          through: models.ReportRecipient,
          foreignKey: 'reportId',
          otherKey: 'grantId',
          as: 'grants',
        });

      models.Report.scope(ENTITY_TYPE.REPORT_SESSION)
        .belongsToMany(models.OtherEntity, {
          through: models.ReportRecipient,
          foreignKey: 'reportId',
          otherKey: 'otherEntityId',
          as: 'otherEntities',
        });

      models.Grant
        .belongsToMany(models.Report.scope(ENTITY_TYPE.REPORT_SESSION), {
          through: models.ReportRecipient,
          foreignKey: 'grantId',
          otherKey: 'reportId',
          as: 'reports',
        });

      models.OtherEntity
        .belongsToMany(models.Report.scope(ENTITY_TYPE.REPORT_SESSION), {
          through: models.ReportRecipient,
          foreignKey: 'otherEntityId',
          otherKey: 'reportId',
          as: 'reports',
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
