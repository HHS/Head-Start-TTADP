const {
  Model,
} = require('sequelize');
const { COLLABORATOR_APPROVAL_STATUSES, COLLABORATOR_TYPES } = require('../constants');

/**
 * Status table. Stores topics used in activity reports and tta plans.
 *
 * @param {} sequelize
 * @param {*} DataTypes
 */
export default (sequelize, DataTypes) => {
  class ReportCollaborator extends Model {
    static associate(models) {
      ReportCollaborator.belongsTo(models.Report, { foreignKey: 'reportId', as: 'report' });
      ReportCollaborator.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
      ReportCollaborator.hasMany(models.ReportCollaboratorType, {
        foreignKey: 'reportCollaboratorId',
        as: 'reportCollaboratorType',
      });
      ReportCollaborator.belongsToMany(models.CollaboratorType, {
        through: models.ReportCollaboratorType,
        foreignKey: 'reportCollaboratorId',
        otherKey: 'collaboratorTypeId',
        as: 'CollaboratorType',
      });
      ReportCollaborator.addScope(COLLABORATOR_TYPES.INSTANTIATOR, {
        include: [{
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
          model: models.CollaboratorType,
          as: 'CollaboratorType',
          required: true,
          where: {
            name: COLLABORATOR_TYPES.POC,
          },
        }],
      });
    }
  }
  ReportCollaborator.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    reportId: {
      type: DataTypes.INTEGER,
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
