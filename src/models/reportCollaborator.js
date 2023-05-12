const {
  Model,
} = require('sequelize');
const { COLLABORATOR_APPROVAL_STATUSES, COLLABORATOR_TYPES } = require('../constants');

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
      ReportCollaborator.hasMany(models.ReportCollaboratorType, {
        foreignKey: 'reportCollaboratorId',
        as: 'reportCollaboratorTypes',
      });
      ReportCollaborator.belongsToMany(models.CollaboratorType, {
        through: models.ReportCollaboratorType,
        foreignKey: 'reportCollaboratorId',
        otherKey: 'collaboratorTypeId',
        as: 'CollaboratorTypes',
      });

      ReportCollaborator.addScope(COLLABORATOR_TYPES.INSTANTIATOR, {
        include: [{
          attributes: [],
          model: models.CollaboratorType,
          as: 'CollaboratorType',
          required: true,
          where: {
            name: COLLABORATOR_TYPES.INSTANTIATOR,
          },
        }],
      });
      ReportCollaborator.addScope(COLLABORATOR_TYPES.OWNER, {
        include: [{
          attributes: [],
          model: models.CollaboratorType,
          as: 'CollaboratorType',
          required: true,
          where: {
            name: COLLABORATOR_TYPES.OWNER,
          },
        }],
      });
      ReportCollaborator.addScope(COLLABORATOR_TYPES.EDITOR, {
        include: [{
          attributes: [],
          model: models.CollaboratorType,
          as: 'CollaboratorType',
          required: true,
          where: {
            name: COLLABORATOR_TYPES.EDITOR,
          },
        }],
      });
      ReportCollaborator.addScope(COLLABORATOR_TYPES.APPROVER, {
        include: [{
          attributes: [],
          model: models.CollaboratorType,
          as: 'CollaboratorType',
          required: true,
          where: {
            name: COLLABORATOR_TYPES.APPROVER,
          },
        }],
      });
      ReportCollaborator.addScope(COLLABORATOR_TYPES.POC, {
        include: [{
          attributes: [],
          model: models.CollaboratorType,
          as: 'CollaboratorType',
          required: true,
          where: {
            name: COLLABORATOR_TYPES.POC,
          },
        }],
      });

      models.Report.hasMany(models.ReportCollaborator, {
        foreignKey: 'reportId',
        as: 'collaborators',
      });
      models.Report.hasOne(models.ReportCollaborator
        .scope(COLLABORATOR_TYPES.INSTANTIATOR), {
        foreignKey: 'reportId',
        as: COLLABORATOR_TYPES.INSTANTIATOR,
      });

      models.Report.hasOne(models.ReportCollaborator.scope(COLLABORATOR_TYPES.OWNER), {
        foreignKey: 'reportId',
        as: COLLABORATOR_TYPES.OWNER,
      });
      models.Report.hasMany(models.ReportCollaborator.scope(COLLABORATOR_TYPES.EDITOR), {
        foreignKey: 'reportId',
        as: `${COLLABORATOR_TYPES.EDITOR}s`,
      });
      models.Report.hasMany(models.ReportCollaborator.scope(COLLABORATOR_TYPES.APPROVER), {
        foreignKey: 'reportId',
        as: `${COLLABORATOR_TYPES.APPROVER}s`, // TODO: limit scope by report type
      });
      models.Report.hasOne(models.ReportCollaborator.scope(COLLABORATOR_TYPES.POC), {
        foreignKey: 'reportId',
        as: COLLABORATOR_TYPES.POC, // TODO: limit scope by report type
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
    status: {
      allowNull: true,
      type: DataTypes.ENUM(Object.values(COLLABORATOR_APPROVAL_STATUSES)),
    },
    note: {
      allowNull: true,
      type: DataTypes.TEXT,
    },
  }, {
    sequelize,
    modelName: 'ReportCollaborator',
    paranoid: true,
  });
  return ReportCollaborator;
};
