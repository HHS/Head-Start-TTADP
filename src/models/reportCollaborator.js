const {
  Model,
} = require('sequelize');
const { ENTITY_TYPE, COLLABORATOR_TYPES } = require('../constants');
const {
  generateJunctionTableAssociations,
} = require('./helpers/associationsAndScopes');
const {
  beforeValidate,
  beforeUpdate,
  afterUpdate,
  afterCreate,
  beforeDestroy,
} = require('./hooks/reportCollaborator');

export default (sequelize, DataTypes) => {
  class ReportCollaborator extends Model {
    static associate(models) {
      ReportCollaborator.addScope('collaboratorType', (collaboratorType) => ({
        include: [{
          attributes: [],
          model: models.CollaboratorType,
          as: 'collaboratorTypes',
          required: true,
          where: {
            name: collaboratorType,
          },
        }],
      }));

      generateJunctionTableAssociations(
        models.ReportCollaborator,
        [
          models.Report,
          models.User,
        ],
        {
          suffixes: Object.values(COLLABORATOR_TYPES).map((collaboratorType) => collaboratorType),
          scopes: Object.values(COLLABORATOR_TYPES).map((collaboratorType) => ({ method: ['collaboratorType', collaboratorType] })),
        },
      );
    }
  }
  ReportCollaborator.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    reportId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: {
          tableName: 'Reports',
        },
        key: 'id',
      },
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: {
          tableName: 'Users',
        },
        key: 'id',
      },
    },
    statusId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: {
          tableName: 'Statuses',
        },
        key: 'id',
      },
    },
    note: {
      allowNull: true,
      type: DataTypes.TEXT,
    },
    currentStatus: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.status ? this.status.name : null;
      },
      async set(value) {
        const status = await sequelize.models.Status
          .scope({ method: ['validFor', ENTITY_TYPE.COLLABORATOR] })
          .findOne({ where: { name: value } });
        if (status) {
          this.setDataValue('statusId', status.id);
        } else {
          throw new Error(`Invalid status name of ${value} for collaborator.`);
        }
      },
    },
    currentRoles: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.roles
          ? this.roles.map(({ name }) => name)
          : [];
      },
      // TODO: finish implementation
      // async set(values) {
      //   const status = await sequelize.models.ReportCollaboratorRole
      //     .findAll({
      //       where: { reportCollaboratorId: this.id },
      //       include: [{
      //         models: sequelize.models.Roles,
      //         as: 'role',
      //         attributes: [],

      //       }],
      //     });
      //   if (status) {
      //     this.setDataValue('statusId', status.id);
      //   } else {
      //     throw new Error(
      //      `Invalid status name of ${value} for report of type ${this.reportType}.`
      //     );
      //   }
      // },
    },
  }, {
    hooks: {
      beforeValidate: async (instance, options) => beforeValidate(sequelize, instance, options),
      afterCreate: async (instance, options) => afterCreate(sequelize, instance, options),
      beforeUpdate: async (instance, options) => beforeUpdate(sequelize, instance, options),
      afterUpdate: async (instance, options) => afterUpdate(sequelize, instance, options),
      beforeDestroy: async (instance, options) => afterUpdate(sequelize, instance, options),
    },
    sequelize,
    modelName: 'ReportCollaborator',
    paranoid: true,
  });
  return ReportCollaborator;
};
