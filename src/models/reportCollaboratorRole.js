const {
  Model,
} = require('sequelize');

/**
 * Status table. Stores topics used in activity reports and tta plans.
 *
 * @param {} sequelize
 * @param {*} DataTypes
 */
export default (sequelize, DataTypes) => {
  class ReportCollaboratorRole extends Model {
    static associate(models) {
      ReportCollaboratorRole.belongsTo(models.ReportCollaborator, {
        foreignKey: 'reportCollaboratorId',
        as: 'reportCollaborator',
      });
      ReportCollaboratorRole.belongsTo(models.Role, {
        foreignKey: 'roleId',
        as: 'role',
      });

      models.ReportCollaborator.hasMany(models.ReportCollaboratorRole, {
        foreignKey: 'reportCollaboratorId',
        as: 'reportCollaboratorRoles',
      });
      models.Role.hasMany(models.ReportCollaboratorRole, {
        foreignKey: 'roleId',
        as: 'reportCollaboratorRoles',
      });
      models.ReportCollaborator.belongsToMany(models.Role, {
        through: models.ReportCollaboratorRole,
        foreignKey: 'reportCollaboratorId',
        otherKey: 'roleId',
        as: 'roles',
      });
      models.Role.belongsToMany(models.ReportCollaborator, {
        through: models.ReportCollaboratorRole,
        foreignKey: 'roleId',
        otherKey: 'reportCollaboratorId',
        as: 'reportCollaborators',
      });
    }
  }
  ReportCollaboratorRole.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    reportCollaboratorId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    roleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'ReportCollaboratorRole',
  });
  return ReportCollaboratorRole;
};
