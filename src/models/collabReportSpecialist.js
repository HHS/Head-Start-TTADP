const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class CollabReportSpecialist extends Model {
    static associate(models) {
      CollabReportSpecialist.belongsTo(models.CollabReport, { foreignKey: 'collabReportId', as: 'collabReport' });
      CollabReportSpecialist.belongsTo(models.User, { foreignKey: 'specialistId', as: 'specialist' });
    }
  }

  CollabReportSpecialist.init({
    collabReportId: {
      allowNull: false,
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'CollabReports',
        key: 'id',
      },
    },
    specialistId: {
      allowNull: false,
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'Users',
        key: 'id',
      },
    },
  }, {
    sequelize,
    modelName: 'CollabReportSpecialist',
    tableName: 'CollabReportSpecialists',
    indexes: [
      {
        unique: true,
        fields: ['collabReportId', 'specialistId'],
      },
    ],
  });

  return CollabReportSpecialist;
};
