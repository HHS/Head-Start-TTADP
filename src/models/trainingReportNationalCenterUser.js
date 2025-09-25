const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class TrainingReportNationalCenterUser extends Model {
    static associate(models) {
      TrainingReportNationalCenterUser.belongsTo(models.NationalCenter, { foreignKey: 'nationalCenterId', as: 'nationalCenter' });
      TrainingReportNationalCenterUser.belongsTo(models.TrainingReport, { foreignKey: 'trainingReportId', as: 'trainingReport', onDelete: 'CASCADE' });
      TrainingReportNationalCenterUser.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });

      models.User.hasMany(TrainingReportNationalCenterUser, { foreignKey: 'userId', as: 'trainingReportNationalCenterUsers' });
      models.TrainingReport.hasMany(TrainingReportNationalCenterUser, { foreignKey: 'trainingReportId', as: 'trainingReportNationalCenterUsers' });
      models.NationalCenter.hasMany(TrainingReportNationalCenterUser, { foreignKey: 'nationalCenterId', as: 'trainingReportNationalCenterUsers' });
    }
  }

  TrainingReportNationalCenterUser.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    trainingReportId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: {
          tableName: 'TrainingReports',
          key: 'id',
        },
      },
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: {
          tableName: 'Users',
          key: 'id',
        },
      },
    },
    userName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    nationalCenterId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: {
          tableName: 'NationalCenters',
          key: 'id',
        },
      },
    },
    nationalCenterName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'TrainingReportNationalCenterUser',
    tableName: 'TrainingReportNationalCenterUsers',
  });
  return TrainingReportNationalCenterUser;
};
