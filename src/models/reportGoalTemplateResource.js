const { Model } = require('sequelize');
const { SOURCE_FIELD } = require('../constants');

export default (sequelize, DataTypes) => {
  class ReportGoalTemplateResource extends Model {
    static associate(models) {
      ReportGoalTemplateResource.belongsTo(models.ReportGoalTemplate, {
        foreignKey: 'reportGoalTemplateId',
        as: 'reportGoalTemplate',
      });
      ReportGoalTemplateResource.belongsTo(models.Resource, { foreignKey: 'resourceId', as: 'resource' });
    }
  }
  ReportGoalTemplateResource.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    reportGoalTemplateId: {
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
      type: DataTypes.ARRAY(DataTypes.ENUM(Object.values(SOURCE_FIELD.GOALTEMPLATE))), // TODO: fix source fields
    },
    // isAutoDetected: {
    //   type: new DataTypes.VIRTUAL(DataTypes.BOOLEAN, ['sourceFields']),
    //   get() {
    //     // eslint-disable-next-line global-require
    //     const { calculateIsAutoDetectedForReport } = require('../services/resource'); // TODO: implement calculateIsAutoDetectedForReport
    //     return calculateIsAutoDetectedForReport(this.get('sourceFields'));
    //   },
    // },
  }, {
    sequelize,
    modelName: 'ReportGoalTemplateResource',
  });
  return ReportGoalTemplateResource;
};
