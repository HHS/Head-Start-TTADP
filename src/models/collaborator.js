const { Model, Op } = require('sequelize');
const {
  beforeValidate,
  beforeCreate,
  beforeDestroy,
  beforeUpdate,
  afterCreate,
  afterDestroy,
  afterRestore,
  afterUpdate,
  afterUpsert,
} = require('./hooks/collaborator');
const { generateFullName } = require('./helpers/generateFullName');
const { ENTITY_TYPES, COLLABORATOR_TYPES, RATIFIER_STATUSES } = require('../constants');

module.exports = (sequelize, DataTypes) => {
  class Collaborator extends Model {
    static associate(models) {
      Collaborator.belongsTo(models.ActivityReport, {
        scope: {
          '$Collaborators.entityType$': ENTITY_TYPES.REPORT,
        },
        foreignKey: 'entityId',
        as: 'report',
        hooks: true,
      });
      Collaborator.belongsTo(models.ActivityReportGoal, {
        scope: {
          '$Collaborators.entityType$': ENTITY_TYPES.REPORTGOAL,
        },
        foreignKey: 'entityId',
        as: 'reportGoal',
        hooks: true,
      });
      Collaborator.belongsTo(models.ActivityReportObjective, {
        scope: {
          '$Collaborators.entityType$': ENTITY_TYPES.REPORTOBJECTIVE,
        },
        foreignKey: 'entityId',
        as: 'reportObjective',
        hooks: true,
      });
      Collaborator.belongsTo(models.Goal, {
        scope: {
          '$Collaborators.entityType$': ENTITY_TYPES.GOAL,
        },
        foreignKey: 'entityId',
        as: 'goal',
        hooks: true,
      });
      Collaborator.belongsTo(models.GoalTemplate, {
        scope: {
          '$Collaborators.entityType$': ENTITY_TYPES.GOALTEMPLATE,
        },
        foreignKey: 'entityId',
        as: 'goalTemplate',
        hooks: true,
      });
      Collaborator.belongsTo(models.Objective, {
        scope: {
          '$Collaborators.entityType$': ENTITY_TYPES.OBJECTIVE,
        },
        foreignKey: 'entityId',
        as: 'objective',
        hooks: true,
      });
      Collaborator.belongsTo(models.ObjectiveTemplate, {
        scope: {
          '$Collaborators.entityType$': ENTITY_TYPES.OBJECTIVETEMPLATE,
        },
        foreignKey: 'entityId',
        as: 'objectiveTemplate',
        hooks: true,
      });
      Collaborator.belongsTo(models.User, { foreignKey: 'userId', as: 'user', hooks: true });
      Collaborator.belongsToMany(models.Role, {
        through: models.CollaboratorRole,
        otherKey: 'roleId',
        foreignKey: 'collaboratorId',
        as: 'roles',
        hooks: true,
      });
      Collaborator.addScope('defaultScope', {
        include: [{
          model: models.User,
          as: 'user',
          required: true,
        }, {
          model: models.Role,
          as: 'roles',
          required: true,
        }],
      });
      Collaborator.addScope('withEntityType', (entityType) => ({
        where: { entityType },
      }));
      Collaborator.addScope('asCollaboratorTypes', (collaboratorType) => ({
        where: { collaboratorTypes: { [Op.contains]: [collaboratorType] } },
      }));
    }
  }
  Collaborator.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    entityType: {
      allowNull: false,
      default: null,
      type: DataTypes.ENUM(Object.keys(ENTITY_TYPES).map((k) => ENTITY_TYPES[k])),
    },
    entityId: {
      allowNull: false,
      type: DataTypes.INTEGER,
    },
    collaboratorTypes: {
      allowNull: false,
      default: null,
      type: DataTypes.ARRAY(
        DataTypes.ENUM(
          Object.keys(COLLABORATOR_TYPES).map((k) => COLLABORATOR_TYPES[k]),
        ),
      ),
    },
    userId: {
      allowNull: false,
      type: DataTypes.INTEGER,
    },
    status: {
      allowNull: true,
      type: DataTypes.ENUM(Object.keys(RATIFIER_STATUSES).map((k) => RATIFIER_STATUSES[k])),
    },
    note: {
      allowNull: true,
      type: DataTypes.TEXT,
    },
    tier: {
      allowNull: false,
      default: 1,
      type: DataTypes.INTEGER,
    },
    createdAt: {
      allowNull: false,
      defaultValue: DataTypes.fn('NOW'),
      type: DataTypes.DATE,
    },
    updatedAt: {
      allowNull: false,
      defaultValue: DataTypes.fn('NOW'),
      type: DataTypes.DATE,
    },
    deletedAt: {
      allowNull: true,
      type: DataTypes.DATE,
    },
    nameWithRole: {
      type: DataTypes.VIRTUAL,
      get() {
        if (this.user) {
          if (this.roles) {
            return generateFullName(this.user.name, this.roles);
          }
          return this.user.fullName;
        }
        return null;
      },
    },
  }, {
    hooks: {
      beforeValidate: async (instance, options) => beforeValidate(sequelize, instance, options),
      beforeCreate: async (instance, options) => beforeCreate(sequelize, instance, options),
      beforeDestroy: async (instance, options) => beforeDestroy(sequelize, instance, options),
      beforeUpdate: async (instance, options) => beforeUpdate(sequelize, instance, options),
      afterCreate: async (instance, options) => afterCreate(sequelize, instance, options),
      afterDestroy: async (instance, options) => afterDestroy(sequelize, instance, options),
      afterRestore: async (instance, options) => afterRestore(sequelize, instance, options),
      afterUpdate: async (instance, options) => afterUpdate(sequelize, instance, options),
      afterUpsert: async (created, options) => afterUpsert(sequelize, created, options),
    },
    // indexes: [{
    //   unique: true,
    //   fields: ['activityReportId', 'userId'],
    // }],
    sequelize,
    paranoid: true,
    modelName: 'Collaborator',
  });
  return Collaborator;
};
