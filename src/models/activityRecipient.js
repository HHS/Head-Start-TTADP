import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class ActivityRecipient extends Model {
    static associate(models) {
      ActivityRecipient.belongsTo(models.ActivityReport, { foreignKey: 'activityReportId' });
      ActivityRecipient.belongsTo(models.Grant, { foreignKey: 'grantId', as: 'grant' });
      ActivityRecipient.belongsTo(models.NonGrantee, { foreignKey: 'nonGranteeId', as: 'nonGrantee' });
    }
  }
  ActivityRecipient.init({
    activityReportId: {
      allowNull: false,
      type: DataTypes.INTEGER,
    },
    grantId: {
      allowNull: true,
      type: DataTypes.INTEGER,
    },
    nonGranteeId: {
      allowNull: true,
      type: DataTypes.INTEGER,
    },
    activityRecipientId: {
      type: DataTypes.VIRTUAL,
      get() {
        if (this.grantId) {
          return this.grantId;
        }
        return this.nonGranteeId;
      },
    },
    name: {
      type: DataTypes.VIRTUAL,
      get() {
        if (this.grant) {
          return this.grant.name;
        }
        return this.nonGrantee.name;
      },
    },
  }, {
    indexes: [
      {
        unique: true,
        fields: ['grantId', 'activityReportId'],
      },
      {
        unique: true,
        fields: ['nonGranteeId', 'activityReportId'],
      },
    ],
    sequelize,
    modelName: 'ActivityRecipient',
    validate: {
      oneNull() {
        if (this.grantId && this.nonGranteeId) {
          throw new Error('Can not specify both grantId and nonGranteeId');
        }
      },
    },
  });
  return ActivityRecipient;
};
