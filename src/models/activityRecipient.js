import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class ActivityRecipient extends Model {
    static associate(models) {
      ActivityRecipient.belongsTo(models.ActivityReport, { foreignKey: 'activityReportId' });
      ActivityRecipient.belongsTo(models.Grant, { foreignKey: 'grantId', as: 'grant' });
      ActivityRecipient.belongsTo(models.OtherEntity, { foreignKey: 'otherEntityId', as: 'otherEntity' });
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
    otherEntityId: {
      allowNull: true,
      type: DataTypes.INTEGER,
    },
    activityRecipientId: {
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
        return this.otherEntity.name;
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
        fields: ['otherEntityId', 'activityReportId'],
      },
    ],
    sequelize,
    modelName: 'ActivityRecipient',
    validate: {
      oneNull() {
        if (this.grantId && this.otherEntityId) {
          throw new Error('Can not specify both grantId and otherEntityId');
        }
      },
    },
  });
  return ActivityRecipient;
};
