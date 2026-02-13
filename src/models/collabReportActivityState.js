const { Model } = require('sequelize')

export default (sequelize, DataTypes) => {
  class CollabReportActivityState extends Model {
    static associate(models) {
      CollabReportActivityState.belongsTo(models.CollabReport, {
        foreignKey: 'collabReportId',
        as: 'collabReport',
      })
    }
  }

  CollabReportActivityState.init(
    {
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
      activityStateCode: {
        allowNull: false,
        type: DataTypes.STRING,
        comment: 'State code (e.g., CA, NY, TX) where the activity takes place',
      },
    },
    {
      sequelize,
      modelName: 'CollabReportActivityState',
      tableName: 'CollabReportActivityStates',
      timestamps: true, // enables createdAt and updatedAt
      paranoid: true,
      indexes: [
        {
          name: 'collab_report_activity_states_activity_state_code_collab_report_id',
          unique: true,
          fields: ['collabReportId', 'activityStateCode'],
        },
      ],
    }
  )

  return CollabReportActivityState
}
