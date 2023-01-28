const { Op, Model } = require('sequelize');
const { COLLABORATOR_TYPES, ENTITY_TYPES, CREATION_METHOD } = require('../constants');
const { beforeValidate, beforeUpdate, afterUpdate } = require('./hooks/objectiveTemplate');
// const { auditLogger } = require('../logger');

export default (sequelize, DataTypes) => {
  class ObjectiveTemplate extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      ObjectiveTemplate.hasMany(models.Objective, { foreignKey: 'objectiveTemplateId', as: 'objectives', hooks: true });
      ObjectiveTemplate.hasMany(models.Collaborator, {
        scope: {
          entityType: ENTITY_TYPES.OBJECTIVETEMPLATE,
          collaboratorTypes: { [Op.contains]: [COLLABORATOR_TYPES.RATIFIER] },
        },
        foreignKey: 'entityId',
        as: 'approvers',
        hooks: true,
      });
      ObjectiveTemplate.hasMany(models.Collaborator, {
        scope: {
          entityType: ENTITY_TYPES.OBJECTIVETEMPLATE,
          collaboratorTypes: { [Op.contains]: [COLLABORATOR_TYPES.EDITOR] },
        },
        foreignKey: 'entityId',
        as: 'collaborators',
        hooks: true,
      });
      ObjectiveTemplate.hasOne(models.Collaborator, {
        scope: {
          entityType: ENTITY_TYPES.OBJECTIVETEMPLATE,
          collaboratorTypes: { [Op.contains]: [COLLABORATOR_TYPES.OWNER] },
        },
        foreignKey: 'entityId',
        as: 'owner',
        hooks: true,
      });
      ObjectiveTemplate.hasOne(models.Collaborator, {
        scope: {
          entityType: ENTITY_TYPES.OBJECTIVETEMPLATE,
          collaboratorTypes: { [Op.contains]: [COLLABORATOR_TYPES.INSTANTIATOR] },
        },
        foreignKey: 'entityId',
        as: 'instantiator',
        hooks: true,
      });
      ObjectiveTemplate.hasMany(models.Approval, {
        scope: {
          entityType: ENTITY_TYPES.OBJECTIVETEMPLATE,
        },
        foreignKey: 'entityId',
        as: 'approvals',
        hooks: true,
      });
      ObjectiveTemplate.hasMany(models.ObjectiveTemplateResource, { foreignKey: 'objectiveTemplateId', as: 'resources', hooks: true });
      ObjectiveTemplate.belongsToMany(models.Topic, {
        through: models.ObjectiveTemplateTopic,
        foreignKey: 'objectiveTemplateId',
        otherKey: 'topicId',
        as: 'topics',
        hooks: true,
      });
      ObjectiveTemplate.hasMany(models.GoalTemplateObjectiveTemplate, { foreignKey: 'objectiveTemplateId', as: 'goalTemplateObjectiveTemplates', hooks: true });
      ObjectiveTemplate.belongsToMany(models.GoalTemplate, {
        through: models.GoalTemplateObjectiveTemplate,
        foreignKey: 'objectiveTemplateId',
        otherKey: 'goalTemplateId',
        as: 'goalTemplates',
        hooks: true,
      });
    }
  }
  ObjectiveTemplate.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    hash: {
      allowNull: false,
      type: DataTypes.TEXT,
    },
    templateTitle: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    regionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    creationMethod: {
      allowNull: false,
      type: DataTypes.ENUM(Object.keys(CREATION_METHOD).map((k) => CREATION_METHOD[k])),
    },
    lastUsed: {
      allowNull: true,
      type: DataTypes.DATE,
    },
    templateTitleModifiedAt: {
      allowNull: false,
      type: DataTypes.DATE,
    },
  }, {
    sequelize,
    modelName: 'ObjectiveTemplate',
    hooks: {
      beforeValidate: async (instance, options) => beforeValidate(sequelize, instance, options),
      beforeUpdate: async (instance, options) => beforeUpdate(sequelize, instance, options),
      afterUpdate: async (instance, options) => afterUpdate(sequelize, instance, options),
    },
  });
  return ObjectiveTemplate;
};
