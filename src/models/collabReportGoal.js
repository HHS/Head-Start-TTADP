const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class CollabReportGoal extends Model {
    static associate(models) {
      CollabReportGoal.belongsTo(models.CollabReport, { foreignKey: 'collabReportId', as: 'collabReport' });
    }
  }

  CollabReportGoal.init({
    collabReportId: {
      allowNull: false,
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'CollabReports',
        key: 'id',
      },
    },
    collabReportGoalId: {
      allowNull: false,
      type: DataTypes.STRING,
      primaryKey: true,
      comment: 'Goal identifier - could be enum or FK to existing goals table',
    },
  }, {
    sequelize,
    modelName: 'CollabReportGoal',
    tableName: 'CollabReportGoals',
    indexes: [
      {
        unique: true,
        fields: ['collabReportId', 'collabReportGoalId'],
      },
    ],
  });

  return CollabReportGoal;
};
