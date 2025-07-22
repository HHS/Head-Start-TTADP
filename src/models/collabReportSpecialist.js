const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class CollabReportSpecialist extends Model {
    static associate(models) {
      CollabReportSpecialist.belongsTo(models.CollabReport, { foreignKey: 'collabReportId', as: 'collabReport' });
      CollabReportSpecialist.belongsTo(models.User, { foreignKey: 'specialistId', as: 'specialist' });
    }
  }

  CollabReportSpecialist.init({
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
    createdAt: {
      allowNull: false,
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      allowNull: false,
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  }, {
    sequelize,
    modelName: 'CollabReportSpecialist',
    tableName: 'CollabReportSpecialists',
    indexes: [
      {
        name: 'collab_report_specialists_specialist_id_collab_report_id',
        unique: true,
        fields: ['collabReportId', 'specialistId'],
      },
    ],
  });

  return CollabReportSpecialist;
};
