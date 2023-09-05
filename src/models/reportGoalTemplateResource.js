const { Model } = require('sequelize');
const { SOURCE_FIELD } = require('../constants');
const { generateJunctionTableAssociations } = require('./helpers/associationsAndScopes');

export default (sequelize, DataTypes) => {
  class ReportGoalTemplateResource extends Model {
    static associate(models) {
      generateJunctionTableAssociations(
        models.ReportGoalTemplateResource,
        [
          models.ReportGoalTemplate,
          models.Resource,
        ],
      );
    }
  }
  ReportGoalTemplateResource.init({
    id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    reportGoalTemplateId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: {
          tableName: 'ReportCollaborators',
        },
        key: 'id',
      },
    },
    resourceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: {
          tableName: 'ReportCollaborators',
        },
        key: 'id',
      },
    },
    sourceFields: {
      allowNull: true,
      default: null,
      type: DataTypes.ARRAY(DataTypes.ENUM(Object.values(SOURCE_FIELD.GOALTEMPLATE))),
      // TODO: fix source fields
    },
    // isAutoDetected: {
    //   type: new DataTypes.VIRTUAL(DataTypes.BOOLEAN, ['sourceFields']),
    //   get() {
    //     // eslint-disable-next-line global-require
    //     const { calculateIsAutoDetectedForReport } = require('../services/resource');
    // TODO: implement calculateIsAutoDetectedForReport
    //     return calculateIsAutoDetectedForReport(this.get('sourceFields'));
    //   },
    // },
  }, {
    sequelize,
    modelName: 'ReportGoalTemplateResource',
  });
  return ReportGoalTemplateResource;
};
