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
} = require('./hooks/activityReportCollaborator');
const { generateFullName } = require('./helpers/generateFullName');
const { COLLABORATOR_TYPES, APPROVAL_STATUSES } = require('../constants');

export default (sequelize, DataTypes) => {
  class ActivityReportCollaborator extends Model {
    static associate(models) {
      ActivityReportCollaborator.belongsTo(models.ActivityReport, {
        foreignKey: 'activityReportId',
        as: 'report',
        hooks: true,
      });
      ActivityReportCollaborator.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
        hooks: true,
      });
      ActivityReportCollaborator.belongsToMany(models.Role, {
        through: models.ActivityReportCollaboratorRole,
        otherKey: 'roleId',
        foreignKey: 'activityReportCollaboratorId',
        as: 'roles',
        hooks: true,
      });
      ActivityReportCollaborator.addScope('defaultScope', {
        include: [{
          model: models.User,
          as: 'user',
          required: true,
          through: { attributes: [] },
        }, {
          model: models.Role,
          as: 'roles',
          required: true,
          through: { attributes: [] },
        }],
      });
      ActivityReportCollaborator.addScope('asCollaboratorTypes', (collaboratorType) => ({
        where: { collaboratorTypes: { [Op.contains]: [collaboratorType] } },
      }));
    }
  }
  ActivityReportCollaborator.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    activityReportId: {
      type: DataTypes.INTEGER,
      allowNull: false,
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
      type: DataTypes.ENUM(Object.keys(APPROVAL_STATUSES).map((k) => APPROVAL_STATUSES[k])),
    },
    note: {
      allowNull: true,
      type: DataTypes.TEXT,
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
    // paranoid: true,
    modelName: 'ActivityReportCollaborator',
  });
  return ActivityReportCollaborator;
};
