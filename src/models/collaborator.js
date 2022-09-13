const { Model } = require('sequelize');
const {
  beforeValidate,
  beforeCreate,
  beforeUpdate,
  afterCreate,
  afterDestroy,
  afterRestore,
  afterUpdate,
  afterUpsert,
} = require('./hooks/collaborator');
// const { generateFullName } = require('./helpers/generateFullName');
const { ENTITY_TYPES, COLLABORATOR_TYPES, RATIFIER_STATUSES } = require('../constants');

module.exports = (sequelize, DataTypes) => {
  class Collaborator extends Model {
    static associate(models) {
      Collaborator.belongsTo(models.ActivityReport, {
        scope: {
          entityType: ENTITY_TYPES.REPORT,
        },
        foreignKey: 'entityId',
        as: 'report',
      });
      Collaborator.belongsTo(models.ActivityReportGoal, {
        scope: {
          entityType: ENTITY_TYPES.REPORTGOAL,
        },
        foreignKey: 'entityId',
        as: 'reportGoal',
      });
      Collaborator.belongsTo(models.ActivityReportObjective, {
        scope: {
          entityType: ENTITY_TYPES.REPORTOBJECTIVE,
        },
        foreignKey: 'entityId',
        as: 'reportObjective',
      });
      Collaborator.belongsTo(models.Goal, {
        scope: {
          entityType: ENTITY_TYPES.GOAL,
        },
        foreignKey: 'entityId',
        as: 'goal',
      });
      Collaborator.belongsTo(models.GoalTemplate, {
        scope: {
          entityType: ENTITY_TYPES.GOALTEMPLATE,
        },
        foreignKey: 'entityId',
        as: 'goalTemplate',
      });
      Collaborator.belongsTo(models.Objective, {
        scope: {
          entityType: ENTITY_TYPES.OBJECTIVE,
        },
        foreignKey: 'entityId',
        as: 'objective',
      });
      Collaborator.belongsTo(models.ObjectiveTemplate, {
        scope: {
          entityType: ENTITY_TYPES.OBJECTIVETEMPLATE,
        },
        foreignKey: 'entityId',
        as: 'objectiveTemplate',
      });
      Collaborator.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
      Collaborator.belongsToMany(models.Role, {
        through: models.CollaboratorRole,
        otherKey: 'roleId',
        foreignKey: 'collaboratorId',
        as: 'roles',
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
    // nameWithRole: {
    //   type: DataTypes.VIRTUAL,
    //   get() {
    //     let collaboratorRoles = this.collaboratorRoles
    //       && this.collaboratorRoles.length
    //       ? this.collaboratorRoles
    //       : null;
    //     collaboratorRoles = !collaboratorRoles
    //       && this.user
    //       && this.user.roles
    //       && this.user.roles.length
    //       ? this.user.roles
    //       : [];
    //     return generateFullName(this.user.name, collaboratorRoles);
    //   },
    // },
  }, {
    hooks: {
      beforeValidate: async (instance, options) => beforeValidate(sequelize, instance, options),
      beforeCreate: async (instance, options) => beforeCreate(sequelize, instance, options),
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
