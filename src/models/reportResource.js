const { Model } = require('sequelize');
const { SOURCE_FIELD } = require('../constants');

export default (sequelize, DataTypes) => {
  class ReportResource extends Model {
    static associate(models) {
      ReportResource.belongsTo(models.Report, { foreignKey: 'reportId', as: 'report' });
      ReportResource.belongsTo(models.Resource, { foreignKey: 'resourceId', as: 'resource' });
    }
  }
  ReportResource.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    reportId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    resourceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    sourceFields: {
      allowNull: true,
      default: null,
      type: DataTypes.ARRAY(DataTypes.ENUM(
        Object.values(SOURCE_FIELD.REPORT),
      )), // TODO: fix source fields
    },
    isAutoDetected: {
      type: new DataTypes.VIRTUAL(DataTypes.BOOLEAN, ['sourceFields']),
      get() {
        // eslint-disable-next-line global-require
        const { calculateIsAutoDetectedForReport } = require('../services/resource'); // TODO: implement calculateIsAutoDetectedForReport
        return calculateIsAutoDetectedForReport(this.get('sourceFields'));
      },
    },
  }, {
    sequelize,
    modelName: 'ReportResource',
  });
  return ReportResource;
};
