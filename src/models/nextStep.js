const { Model } = require('sequelize');
const { NEXTSTEP_NOTETYPE } = require('../constants');
const { formatDate } = require('../lib/modelHelpers');

module.exports = (sequelize, DataTypes) => {
  class NextStep extends Model {
    static associate(models) {
      NextStep.belongsTo(models.ActivityReport, { foreignKey: 'activityReportId' });
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
        notNull: true,
        notEmpty: true,
      },
    },
    noteType: {
      allowNull: false,
      type: DataTypes.ENUM(Object.values(NEXTSTEP_NOTETYPE)),
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
