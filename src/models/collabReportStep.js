const { Model } = require('sequelize');
const { formatDate } = require('../lib/modelHelpers');

export default (sequelize, DataTypes) => {
  class CollabReportStep extends Model {
    static associate(models) {
      CollabReportStep.belongsTo(models.CollabReport, { foreignKey: 'collabReportId', as: 'collabReport' });
    }
  }

  CollabReportStep.init({
    collabReportId: {
      allowNull: false,
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'CollabReports',
        key: 'id',
      },
    },
    collabStepId: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    collabStepDetail: {
      allowNull: false,
      type: DataTypes.TEXT,
    },
    collabStepCompleteDate: {
      allowNull: false,
      type: DataTypes.DATEONLY,
      get: formatDate,
    },
    collabStepPriority: {
      allowNull: false,
      type: DataTypes.SMALLINT,
      comment: 'Used for ordering steps without affecting auto-generated IDs',
    },
  }, {
    sequelize,
    modelName: 'CollabReportStep',
    tableName: 'CollabReportSteps',
    indexes: [
      {
        fields: ['collabReportId', 'collabStepPriority'],
      },
    ],
  });

  return CollabReportStep;
};
