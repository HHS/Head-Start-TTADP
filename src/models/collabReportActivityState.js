const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class CollabReportActivityState extends Model {
    static associate(models) {
      CollabReportActivityState.belongsTo(models.CollabReport, { foreignKey: 'collabReportId', as: 'collabReport' });
    }
  }

  CollabReportActivityState.init({
    collabReportId: {
      allowNull: false,
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'CollabReports',
        key: 'id',
      },
    },
    activityStateCode: {
      allowNull: false,
      type: DataTypes.STRING,
      primaryKey: true,
      comment: 'State code (e.g., CA, NY, TX) where the activity takes place',
    },
  }, {
    sequelize,
    modelName: 'CollabReportActivityState',
    tableName: 'CollabReportActivityStates',
    indexes: [
      {
        unique: true,
        fields: ['collabReportId', 'activityStateCode'],
      },
    ],
  });

  return CollabReportActivityState;
};
