const { Model } = require('sequelize');
const { automaticallyGenerateJunctionTableAssociations } = require('./helpers/associationsAndScopes');

export default (sequelize, DataTypes) => {
  class ReportObjectiveTemplateTrainer extends Model {
    static associate(models) {
      automaticallyGenerateJunctionTableAssociations(this, models);
    }
  }
  ReportObjectiveTemplateTrainer.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.BIGINT,
    },
    reportObjectiveTemplateId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: {
          tableName: 'ReportObjectiveTemplates',
        },
        key: 'id',
      },
    },
    nationalCenterId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: {
          tableName: 'NationalCenters',
        },
        key: 'id',
      },
    },
  }, {
    sequelize,
    modelName: 'ReportObjectiveTemplateTrainer',
  });
  return ReportObjectiveTemplateTrainer;
};
