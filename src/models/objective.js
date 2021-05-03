const {
  Model,
} = require('sequelize');

/**
 * Objective table. Stores objectives for goals.
 *
 * @param {} sequelize
 * @param {*} DataTypes
 */
module.exports = (sequelize, DataTypes) => {
  class Objective extends Model {
    static associate(models) {
      Objective.belongsToMany(models.ActivityReport, { through: models.ActivityReportObjective, foreignKey: 'objectiveId', as: 'activityReports' });
      Objective.belongsTo(models.Goal, { foreignKey: 'goalId', as: 'goal' });
    }
  }
  Objective.init({
    goalId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    title: DataTypes.TEXT,
    ttaProvided: DataTypes.TEXT,
    status: DataTypes.STRING,
  }, {
    sequelize,
    modelName: 'Objective',
  });
  return Objective;
};
