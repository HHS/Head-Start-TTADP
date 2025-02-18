const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class ActivityRecipient extends Model {
    static associate(models) {
      ActivityRecipient.belongsTo(models.ActivityReport, { foreignKey: 'activityReportId', as: 'activityReport' });
      ActivityRecipient.belongsTo(models.Grant, { foreignKey: 'grantId', as: 'grant' });
      ActivityRecipient.belongsTo(models.OtherEntity, { foreignKey: 'otherEntityId', as: 'otherEntity' });

      ActivityRecipient.addScope('defaultScope', {
        include: [
          { model: models.Grant, as: 'grant' },
          { model: models.OtherEntity, as: 'otherEntity' },
        ],
      });
    }
  }
  ActivityRecipient.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
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
        if (this.otherEntity) {
          return this.otherEntity.name;
        }
        return null;
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
