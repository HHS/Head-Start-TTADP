const {
  Model,
} = require('sequelize');
const { ENTITY_TYPE, COLLABORATOR_TYPES } = require('../constants');
const { collectReportMatrixAssociationsForModel } = require('./helpers/reportDataMatrix');
const {
  camelToPascalCase,
  generateJunctionTableAssociations,
} = require('./helpers/associationsAndScopes');

export default (sequelize, DataTypes) => {
  class ReportCollaborator extends Model {
    static associate(models) {
      // Role - located in ReportCollaboratorRole
      // Type - located in ReportCollaboratorType

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

      // User
      generateJunctionTableAssociations(
        models.ReportCollaborator,
        [
          models.Report,
          models.User,
        ],
      );

      Object.values(COLLABORATOR_TYPES).forEach((collaboratorType) => {
        models.User.hasMany(this.scope({ method: ['collaboratorType', collaboratorType] }), {
          foreignKey: 'userId',
          as: `reportCollaboratorsAs${camelToPascalCase(collaboratorType)}`,
        });
        this.scope({ method: ['collaboratorType', collaboratorType] }).belongsTo(models.User, {
          foreignKey: 'userId',
          as: `usersAs${camelToPascalCase(collaboratorType)}`,
        });
      });

      // Status
      this.belongsTo(models.Status, {
        foreignKey: 'statusId',
        as: 'status',
      });

      models.Status.hasMany(this, {
        foreignKey: 'statusId',
        as: 'reportCollaborators',
      });

      console.log('####', ReportCollaborator.associations);
      console.log('####', models.User.associations);

      // Reports
      collectReportMatrixAssociationsForModel(models, ReportCollaborator.name)
        .forEach(({
          model,
          type,
          prefix,
          associations,
        }) => {
          console.log({
            model,
            type,
            prefix,
            associations,
          });
          associations.forEach((config) => {
            const localModel = config.method
              ? this.scope({ method: config.method })
              : this;

              config.forward.forEach((details) => model[details.type](localModel,{
                foreignKey: 'reportId',
                as: ``,
              }));
              config.reverse.forEach((details) => localModel[details.type](model,{
                foreignKey: 'reportId',
                as: ``,
              }));

            switch(config.associationType) {
              case 'hasOne':
                model.hasOne(localModel, {
                  foreignKey: 'reportId',
                  as: config.as,
                });
                break;
              case 'hasMany':
                model.hasMany(localModel, {
                foreignKey: 'reportId',
                as: config.as,
              });
                break;
            }

            model.belongsToMany(models.User, {
              through: localModel,
              foreignKey: 'reportId',
              otherKey: 'userId',
              as: config.as
                ? `usersAs${config.as}For${prefix}`
                : `usersFor${prefix}`,
            });
            models.User.belongsToMany(model, {
              through: localModel,
              foreignKey: 'userId',
              otherKey: 'reportId',
              as: config.as
                ? `${prefix}sAs${config.as}`
                : `${prefix}s`,
            });

          });
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
