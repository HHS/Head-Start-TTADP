const { Model } = require('sequelize');
const { formatDate } = require('../lib/modelHelpers');

export default (sequelize, DataTypes) => {
  class NextStep extends Model {
    static associate(models) {
      NextStep.belongsTo(models.ActivityReport, { foreignKey: 'activityReportId', hooks: true });
    }
  }
  NextStep.init({
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
      type: DataTypes.ENUM('SPECIALIST', 'RECIPIENT'),
    },
    completeDate: {
      type: DataTypes.DATEONLY,
      get: formatDate,
    },
  }, {
    sequelize,
    modelName: 'NextStep',
  });
  return NextStep;
};
