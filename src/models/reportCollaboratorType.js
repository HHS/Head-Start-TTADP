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
  class ReportCollaboratorType extends Model {
    static associate(models) {
      ReportCollaboratorType.belongsTo(models.ReportCollaborator, { foreignKey: 'reportCollaboratorId', as: 'reportCollaborator' });
      ReportCollaboratorType.belongsTo(models.CollaboratorType, { foreignKey: 'collaboratorTypeId', as: 'collaboratorType' });
    }
  }
  ReportCollaboratorType.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    reportCollaboratorId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    collaboratorTypeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'ReportCollaboratorType',
  });
  return ReportCollaboratorType;
};
