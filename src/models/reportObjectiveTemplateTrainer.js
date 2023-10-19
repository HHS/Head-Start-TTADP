const { Model } = require('sequelize');
const { automaticallyGenerateJunctionTableAssociations } = require('./helpers/associationsAndScopes');

export default (sequelize, DataTypes) => {
  class ReportObjectiveTemplateTrainer extends Model {
    static async associate(models) {
      await automaticallyGenerateJunctionTableAssociations(this, models);
    }
  }
  ReportObjectiveTemplateTrainer.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    reportObjectiveTemplateId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: {
          tableName: 'ReportObjectiveTemplates',
        },
        key: 'id',
      },
    },
    nationalCenterId: {
      type: DataTypes.INTEGER,
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
