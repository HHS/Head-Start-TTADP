const {
  Model,
} = require('sequelize');
const { generateJunctionTableAssociations } = require('./helpers/associationsAndScopes');

/**
 * Status table. Stores topics used in activity reports and tta plans.
 *
 * @param {} sequelize
 * @param {*} DataTypes
 */
export default (sequelize, DataTypes) => {
  class ReportCollaboratorType extends Model {
    static associate(models) {
      generateJunctionTableAssociations(
        models.ReportCollaboratorType,
        models.ReportCollaborator,
        models.CollaboratorType,
      );
    }
  }
  ReportCollaboratorType.init({
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
    collaboratorTypeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: {
          tableName: 'CollaboratorTypes',
        },
        key: 'id',
      },
    },
  }, {
    sequelize,
    modelName: 'ReportCollaboratorType',
  });
  return ReportCollaboratorType;
};
