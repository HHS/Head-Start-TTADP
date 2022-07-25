const { Model } = require('sequelize');
const {
  afterCreate,
  afterDestroy,
  afterRestore,
  afterUpdate,
  afterUpsert,
} = require('./hooks/collaborator');
const { ENTITY_TYPES, COLLABORATOR_TYPES, RATIFIER_STATUSES } = require('../constants');

module.exports = (sequelize, DataTypes) => {
  class Collaborator extends Model {
    static associate(models) {
      Collaborator.belongsToMany(models.ActivityReport, {
        scope: {
          entityType: 'ActivityReport',
        },
        foreignKey: 'entityId',
        as: 'activityReport',
      });
      Collaborator.belongsToMany(models.Goal, {
        scope: {
          entityType: 'Goal',
        },
        foreignKey: 'entityId',
        as: 'goal',
      });
      Collaborator.belongsToMany(models.GoalTemplate, {
        scope: {
          entityType: 'GoalTemplate',
        },
        foreignKey: 'entityId',
        as: 'goalTemplate',
      });
      Collaborator.belongsToMany(models.Objective, {
        scope: {
          entityType: 'Objective',
        },
        foreignKey: 'entityId',
        as: 'objective',
      });
      Collaborator.belongsToMany(models.ObjectiveTemplate, {
        scope: {
          entityType: 'ObjectiveTemplate',
        },
        foreignKey: 'entityId',
        as: 'objectiveTemplate',
      });
      Collaborator.belongsTo(models.User, { foreignKey: 'userId' });
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
      allowNull: true,
      default: null,
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
  }, {
    hooks: {
      afterCreate: async (instance) => afterCreate(sequelize, instance),
      afterDestroy: async (instance) => afterDestroy(sequelize, instance),
      afterRestore: async (instance) => afterRestore(sequelize, instance),
      afterUpdate: async (instance) => afterUpdate(sequelize, instance),
      afterUpsert: async (instance) => afterUpsert(sequelize, instance),
    },
    indexes: [{
      unique: true,
      fields: ['activityReportId', 'userId'],
    }],
    sequelize,
    paranoid: true,
    modelName: 'Collaborator',
  });
  return Collaborator;
};
