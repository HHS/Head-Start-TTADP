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
      ReportCollaboratorRole.belongsTo(models.ReportCollaborator, { foreignKey: 'reportCollaboratorId', as: 'reportCollaborator' });
      ReportCollaboratorRole.belongsTo(models.Role, { foreignKey: 'roleId', as: 'role' });
    }
  }
  ReportCollaboratorRole.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    reportCollaboratorId: {
      type: DataTypes.INTEGER,
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
