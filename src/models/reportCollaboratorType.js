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
      ReportCollaboratorType.belongsTo(models.TargetPopulation, { foreignKey: 'collaboratorTypeId', as: 'collaboratorType' });
    }
  }
  ReportCollaboratorType.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    reportCollaboratorId: {
      type: DataTypes.INTEGER,
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
