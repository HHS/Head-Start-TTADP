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
      Objective.hasMany(models.ObjectiveResource, { foreignKey: 'objectiveId', as: 'resources' });
      //Objective.belongsToMany(models.Topic, { through: models.ObjectiveTopic, foreignKey: 'topicId', as: 'topics' });
      Objective.belongsToMany(models.Topic, { through: models.ObjectiveTopic, foreignKey: 'objectiveId', as: 'topics' });
      Objective.belongsTo(models.ObjectiveTemplate, { foreignKey: 'objectiveTemplateId', as: +'objectiveTemplates', onDelete: 'cascade' });
      Objective.hasMany(models.ObjectiveFile, { foreignKey: 'objectiveId', as: 'objectiveFiles' });
      Objective.belongsToMany(models.File, {
        through: models.ObjectiveFile,
        // The key in the join table that points to the model defined in this file
        foreignKey: 'objectiveId',
        // The key in the join table that points to the "target" of the belongs to many (Users in
        // this case)
        otherKey: 'fileId',
        as: 'files',
      });
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
    objectiveTemplateId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: {
          tableName: 'objectiveTemplates',
        },
        key: 'id',
      },
      onUpdate: 'CASCADE',
    },
  }, {
    sequelize,
    modelName: 'Objective',
  });
  return Objective;
};
