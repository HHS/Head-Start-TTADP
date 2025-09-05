const { Model } = require('sequelize');
const { formatDate } = require('../lib/modelHelpers');

export default (sequelize, DataTypes) => {
  class CollabReport extends Model {
    static associate(models) {
      CollabReport.hasMany(models.CollabReportSpecialist, { foreignKey: 'collabReportId', as: 'collabReportSpecialists' });
      CollabReport.belongsToMany(models.User, {
        through: models.CollabReportSpecialist,
        foreignKey: 'collabReportId',
        otherKey: 'specialistId',
        as: 'collaboratingSpecialists',
      });
      CollabReport.hasMany(models.CollabReportReason, { foreignKey: 'collabReportId', as: 'reportReasons' });
      CollabReport.hasMany(models.CollabReportActivityState, { foreignKey: 'collabReportId', as: 'activityStates' });
      CollabReport.hasMany(models.CollabReportGoal, { foreignKey: 'collabReportId', as: 'reportGoals' });
      CollabReport.hasMany(models.CollabReportDataUsed, { foreignKey: 'collabReportId', as: 'dataUsed' });
      CollabReport.hasMany(models.CollabReportStep, { foreignKey: 'collabReportId', as: 'steps' });
    }
  }

  CollabReport.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    name: {
      allowNull: false,
      type: DataTypes.STRING,
    },
    status: {
      allowNull: false,
      type: DataTypes.ENUM(['draft', 'submitted', 'reviewed', 'needs_approval', 'approved']),
    },
    startDate: {
      allowNull: false,
      type: DataTypes.DATEONLY,
      get: formatDate,
    },
    endDate: {
      allowNull: false,
      type: DataTypes.DATEONLY,
      get: formatDate,
    },
    duration: {
      allowNull: false,
      type: DataTypes.SMALLINT,
      validate: {
        min: 0,
      },
    },
    isStateActivity: {
      allowNull: false,
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    conductMethod: {
      allowNull: false,
      type: DataTypes.ENUM(['email', 'phone', 'in_person', 'virtual']),
    },
    description: {
      allowNull: false,
      type: DataTypes.TEXT,
    },
  }, {
    sequelize,
    modelName: 'CollabReport',
    tableName: 'CollabReports',
    paranoid: true, // enables soft deletes with deletedAt
    timestamps: true, // enables createdAt and updatedAt
  });

  return CollabReport;
};
