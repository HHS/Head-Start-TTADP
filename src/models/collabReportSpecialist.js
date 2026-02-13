const { Model } = require('sequelize')

export default (sequelize, DataTypes) => {
  class CollabReportSpecialist extends Model {
    static associate(models) {
      CollabReportSpecialist.belongsTo(models.CollabReport, {
        foreignKey: 'collabReportId',
        as: 'collabReport',
      })
      CollabReportSpecialist.belongsTo(models.User, {
        foreignKey: 'specialistId',
        as: 'specialist',
      })
    }
  }

  CollabReportSpecialist.init(
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
      specialistId: {
        allowNull: false,
        type: DataTypes.INTEGER,
        references: {
          model: 'Users',
          key: 'id',
        },
      },
    },
    {
      sequelize,
      modelName: 'CollabReportSpecialist',
      tableName: 'CollabReportSpecialists',
      paranoid: true, // enables deletedAt
      timestamps: true, // enables createdAt and updatedAt
      indexes: [
        {
          name: 'collab_report_specialists_specialist_id_collab_report_id',
          unique: true,
          fields: ['collabReportId', 'specialistId'],
        },
      ],
    }
  )

  return CollabReportSpecialist
}
