const {
  Model,
} = require('sequelize');
const { COLLABORATOR_APPROVAL_STATUSES } = require('../constants');

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
