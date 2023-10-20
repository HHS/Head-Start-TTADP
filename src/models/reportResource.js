const { Model } = require('sequelize');
const { SOURCE_FIELD } = require('../constants');
const { automaticallyGenerateJunctionTableAssociations } = require('./helpers/associationsAndScopes');

export default (sequelize, DataTypes) => {
  class ReportResource extends Model {
    static async associate(models) {
      await automaticallyGenerateJunctionTableAssociations(this, models);
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
    tableName: {
      allowNull: false,
      type: DataTypes.TEXT,
    },
    columnName: {
      allowNull: true,
      type: DataTypes.TEXT,
    },
    tableId: {
      allowNull: false,
      type: DataTypes.INTEGER,
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
