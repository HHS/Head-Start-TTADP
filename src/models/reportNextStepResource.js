const { Model } = require('sequelize');
const { SOURCE_FIELD } = require('../constants');
const { automaticallyGenerateJunctionTableAssociations } = require('./helpers/associationsAndScopes');

export default (sequelize, DataTypes) => {
  class ReportNextStepResource extends Model {
    static associate(models) {
      automaticallyGenerateJunctionTableAssociations(this, models);
    }
  }
  ReportNextStepResource.init({
    id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    reportId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: {
          tableName: 'Reports',
        },
        key: 'id',
      },
    },
    resourceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: {
          tableName: 'Resources',
        },
        key: 'id',
      },
    },
    sourceFields: {
      allowNull: true,
      default: null,
      type: DataTypes.ARRAY(DataTypes.ENUM(
        Object.values(SOURCE_FIELD.NEXTSTEPS),
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
    modelName: 'ReportNextStepResource',
  });
  return ReportNextStepResource;
};
