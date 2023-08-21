const {
  Model,
} = require('sequelize');
const { generateJunctionTableAssociations } = require('./helpers/associations');

/**
 * Status table. Stores topics used in activity reports and tta plans.
 *
 * @param {} sequelize
 * @param {*} DataTypes
 */
export default (sequelize, DataTypes) => {
  class ReportCollaboratorRole extends Model {
    static associate(models) {
      generateJunctionTableAssociations(
        models.ReportCollaboratorRole,
        models.ReportCollaborator,
        models.Role,
      );
    }
  }
  ReportCollaboratorRole.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    reportCollaboratorId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: {
          tableName: 'ReportCollaborators',
        },
        key: 'id',
      },
    },
    roleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: {
          tableName: 'Roles',
        },
        key: 'id',
      },
    },
  }, {
    sequelize,
    modelName: 'ReportCollaboratorRole',
  });
  return ReportCollaboratorRole;
};
