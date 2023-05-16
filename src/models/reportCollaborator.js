const {
  Model,
} = require('sequelize');
const { ENTITY_TYPE, COLLABORATOR_TYPES } = require('../constants');

export default (sequelize, DataTypes) => {
  class ReportCollaborator extends Model {
    static associate(models) {
      ReportCollaborator.belongsTo(models.Report, {
        foreignKey: 'reportId',
        as: 'report',
      });
      ReportCollaborator.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
      ReportCollaborator.belongsTo(models.Status, {
        foreignKey: 'statusId',
        as: 'status',
      });
      ReportCollaborator.hasMany(models.ReportCollaboratorType, {
        foreignKey: 'reportCollaboratorId',
        as: 'reportCollaboratorTypes',
      });
      ReportCollaborator.belongsToMany(models.CollaboratorType, {
        through: models.ReportCollaboratorType,
        foreignKey: 'reportCollaboratorId',
        otherKey: 'collaboratorTypeId',
        as: 'collaboratorTypes',
      });

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

      models.Status.hasMany(models.ReportCollaborator, {
        foreignKey: 'statusId',
        as: 'reportCollaborators',
      });

      models.Report.hasMany(models.ReportCollaborator, {
        foreignKey: 'reportId',
        as: 'collaborators',
      });
      models.Report.hasOne(models.ReportCollaborator
        .scope({ method: ['collaboratorType', COLLABORATOR_TYPES.INSTANTIATOR] }), {
        foreignKey: 'reportId',
        as: COLLABORATOR_TYPES.INSTANTIATOR,
      });

      models.Report.hasOne(models.ReportCollaborator.scope({ method: ['collaboratorType', COLLABORATOR_TYPES.OWNER] }), {
        foreignKey: 'reportId',
        as: COLLABORATOR_TYPES.OWNER,
      });
      models.Report.hasMany(models.ReportCollaborator.scope({ method: ['collaboratorType', COLLABORATOR_TYPES.EDITOR] }), {
        foreignKey: 'reportId',
        as: `${COLLABORATOR_TYPES.EDITOR}s`,
      });
      models.Report.hasMany(models.ReportCollaborator.scope({ method: ['collaboratorType', COLLABORATOR_TYPES.APPROVER] }), {
        foreignKey: 'reportId',
        as: `${COLLABORATOR_TYPES.APPROVER}s`, // TODO: limit scope by report type
      });
      models.Report.hasOne(models.ReportCollaborator.scope({ method: ['collaboratorType', COLLABORATOR_TYPES.POC] }), {
        foreignKey: 'reportId',
        as: COLLABORATOR_TYPES.POC, // TODO: limit scope by report type
      });

      models.User.hasMany(models.ReportCollaborator, {
        foreignKey: 'userId',
        as: 'reportCollaborators',
      });

      models.User.hasMany(models.ReportCollaborator.scope({ method: ['collaboratorType', COLLABORATOR_TYPES.INSTANTIATOR] }), {
        foreignKey: 'userId',
        as: `reportCollaboratorsAs${COLLABORATOR_TYPES.INSTANTIATOR}`,
      });

      models.User.hasMany(models.ReportCollaborator.scope({ method: ['collaboratorType', COLLABORATOR_TYPES.OWNER] }), {
        foreignKey: 'userId',
        as: `reportCollaboratorsAs${COLLABORATOR_TYPES.OWNER}`,
      });

      models.User.hasMany(models.ReportCollaborator.scope({ method: ['collaboratorType', COLLABORATOR_TYPES.EDITOR] }), {
        foreignKey: 'userId',
        as: `reportCollaboratorsAs${COLLABORATOR_TYPES.EDITOR}`,
      });

      models.User.hasMany(models.ReportCollaborator.scope({ method: ['collaboratorType', COLLABORATOR_TYPES.APPROVER] }), {
        foreignKey: 'userId',
        as: `reportCollaboratorsAs${COLLABORATOR_TYPES.APPROVER}`,
      });

      models.User.hasMany(models.ReportCollaborator.scope({ method: ['collaboratorType', COLLABORATOR_TYPES.POC] }), {
        foreignKey: 'userId',
        as: `reportCollaboratorsAs${COLLABORATOR_TYPES.POC}`,
      });

      models.Report.belongsToMany(models.User, {
        through: models.ReportCollaborator,
        foreignKey: 'reportId',
        otherKey: 'userId',
        as: 'users',
      });
      models.Report.belongsToMany(models.User, {
        through: models.ReportCollaborator.scope({ method: ['collaboratorType', COLLABORATOR_TYPES.INSTANTIATOR] }),
        foreignKey: 'reportId',
        otherKey: 'userId',
        as: `usersAs${COLLABORATOR_TYPES.INSTANTIATOR}`,
      });
      models.Report.belongsToMany(models.User, {
        through: models.ReportCollaborator.scope({ method: ['collaboratorType', COLLABORATOR_TYPES.OWNER] }),
        foreignKey: 'reportId',
        otherKey: 'userId',
        as: `usersAs${COLLABORATOR_TYPES.OWNER}`,
      });
      models.Report.belongsToMany(models.User, {
        through: models.ReportCollaborator.scope({ method: ['collaboratorType', COLLABORATOR_TYPES.EDITOR] }),
        foreignKey: 'reportId',
        otherKey: 'userId',
        as: `usersAs${COLLABORATOR_TYPES.EDITOR}`,
      });
      models.Report.belongsToMany(models.User, {
        through: models.ReportCollaborator.scope({ method: ['collaboratorType', COLLABORATOR_TYPES.APPROVER] }),
        foreignKey: 'reportId',
        otherKey: 'userId',
        as: `usersAs${COLLABORATOR_TYPES.APPROVER}`, // TODO: limit scope by report type
      });
      models.Report.belongsToMany(models.User, {
        through: models.ReportCollaborator.scope({ method: ['collaboratorType', COLLABORATOR_TYPES.POC] }),
        foreignKey: 'reportId',
        otherKey: 'userId',
        as: `usersAs${COLLABORATOR_TYPES.POC}`, // TODO: limit scope by report type
      });

      models.User.belongsToMany(models.Report, {
        through: models.ReportCollaborator,
        foreignKey: 'userId',
        otherKey: 'reportId',
        as: 'reports',
      });
      models.User.belongsToMany(models.Report, {
        through: models.ReportCollaborator.scope({ method: ['collaboratorType', COLLABORATOR_TYPES.INSTANTIATOR] }),
        foreignKey: 'userId',
        otherKey: 'reportId',
        as: `reportsAs${COLLABORATOR_TYPES.INSTANTIATOR}`,
      });
      models.User.belongsToMany(models.Report, {
        through: models.ReportCollaborator.scope({ method: ['collaboratorType', COLLABORATOR_TYPES.OWNER] }),
        foreignKey: 'userId',
        otherKey: 'reportId',
        as: `reportsAs${COLLABORATOR_TYPES.OWNER}`,
      });
      models.User.belongsToMany(models.Report, {
        through: models.ReportCollaborator.scope({ method: ['collaboratorType', COLLABORATOR_TYPES.EDITOR] }),
        foreignKey: 'userId',
        otherKey: 'reportId',
        as: `reportsAs${COLLABORATOR_TYPES.EDITOR}`,
      });
      models.User.belongsToMany(models.Report, {
        through: models.ReportCollaborator.scope({ method: ['collaboratorType', COLLABORATOR_TYPES.APPROVER] }),
        foreignKey: 'userId',
        otherKey: 'reportId',
        as: `reportsAs${COLLABORATOR_TYPES.APPROVER}`, // TODO: limit scope by report type
      });
      models.User.belongsToMany(models.Report, {
        through: models.ReportCollaborator.scope({ method: ['collaboratorType', COLLABORATOR_TYPES.POC] }),
        foreignKey: 'userId',
        otherKey: 'reportId',
        as: `reportsAs${COLLABORATOR_TYPES.POC}`, // TODO: limit scope by report type
      });
    }
  }
  ReportCollaborator.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    reportId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    statusId: {
      type: DataTypes.INTEGER,
      allowNull: true,
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
    sequelize,
    modelName: 'ReportCollaborator',
    paranoid: true,
  });
  return ReportCollaborator;
};
