import { Model } from 'sequelize';

module.exports = (sequelize, DataTypes) => {
  class NextStep extends Model {
    static associate(models) {
      NextStep.belongsTo(models.ActivityReport, { foreignKey: 'activityReportId' });
      NextStep.belongsTo(models.User, { foreignKey: 'userId' });
    }
  }
  NextStep.init({
    userId: {
      type: DataTypes.INTEGER,
    },
    activityReportId: {
      type: DataTypes.INTEGER,
    },
    note: {
      allowNull: false,
      type: DataTypes.TEXT,
      validate: {
        isNull: false,
        isEmpty: false,
      },
    },
    noteType: {
      allowNull: false,
      type: DataTypes.ENUM('SPECIALIST', 'GRANTEE'),
    },
  }, {
    sequelize,
    modelName: 'NextStep',
  });
  return NextStep;
};
