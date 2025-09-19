const { Model } = require('sequelize');
const { formatDate } = require('../lib/modelHelpers');

export default (sequelize, DataTypes) => {
  class CollabReportStep extends Model {
    static associate(models) {
      CollabReportStep.belongsTo(models.CollabReport, { foreignKey: 'collabReportId', as: 'collabReport' });
    }
  }

  CollabReportStep.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    collabReportId: {
      allowNull: false,
      type: DataTypes.INTEGER,
      references: {
        model: 'CollabReports',
        key: 'id',
      },
    },
    collabStepId: {
      allowNull: false,
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
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        name: 'collab_report_steps_collab_step_id_collab_report_id',
        unique: true,
        fields: ['collabReportId', 'collabStepId'],
      },
      {
        fields: ['collabReportId', 'collabStepPriority'],
      },
    ],
  });

  return CollabReportStep;
};
