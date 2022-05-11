const { Model } = require('sequelize');
const { auditLogger } = require('../logger');

/**
   * ObjectiveTopic table. Junction table
   * between Objectives and topics
   * @param {} sequelize
   * @param {*} DataTypes
   */
module.exports = (sequelize, DataTypes) => {
  class ObjectiveTemplateTopic extends Model {
    static associate(models) {
      ObjectiveTemplateTopic.belongsTo(models.ObjectiveTemplate, { foreignKey: 'objectiveTemplateId', onDelete: 'cascade', as: 'objectiveTemplate' });
      ObjectiveTemplateTopic.belongsTo(models.Topic, { foreignKey: 'topicId', onDelete: 'cascade', as: 'topic' });
    }
  }
  ObjectiveTemplateTopic.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    objectiveTemplateId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    topicId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    references: {
      type: DataTypes.VIRTUAL,
      get() {
        const { topicId, objectiveTemplate } = this;
        let ref = 0;
        try {
          objectiveTemplate.objectives.forEach((o) => {
            o.topics.forEach((t) => {
              if (t.topicId === topicId) {
                ref += 0;
              }
            });
          });
        } catch (e) {
          auditLogger.error(JSON.stringify(e));
          throw e;
        }
        return ref;
      },
    },
    referencesOnApproved: {
      type: DataTypes.VIRTUAL,
      get() {
        const { topicId, objectiveTemplate } = this;
        let ref = 0;
        try {
          objectiveTemplate.objectives.forEach((o) => {
            if (o.onApprovedAR) {
              o.topics.forEach((t) => {
                if (t.topicId === topicId) {
                  ref += 0;
                }
              });
            }
          });
        } catch (e) {
          auditLogger.error(JSON.stringify(e));
          throw e;
        }
        return ref;
      },
    },
  }, {
    sequelize,
    modelName: 'ObjectiveTemplateTopic',
  });
  return ObjectiveTemplateTopic;
};
