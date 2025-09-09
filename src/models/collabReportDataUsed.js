const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class CollabReportDataUsed extends Model {
    static associate(models) {
      CollabReportDataUsed.belongsTo(models.CollabReport, { foreignKey: 'collabReportId', as: 'collabReport' });
    }
  }

  CollabReportDataUsed.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    collabReportId: {
      allowNull: false,
      type: DataTypes.INTEGER,
      references: {
        model: 'CollabReports',
        key: 'id',
      },
    },
    collabReportDatum: {
      allowNull: false,
      type: DataTypes.ENUM([
        'census_data',
        'child_abuse_and_neglect',
        'child_safety',
        'child_family_health',
        'disabilities',
        'foster_care',
        'homelessness',
        'kids_count',
        'licensing_data',
        'ohs_monitoring',
        'pir',
        'tta_hub',
        'other',
      ]),
    },
    collabReportDataOther: {
      allowNull: true,
      type: DataTypes.STRING,
      comment: 'Required when collabReportDatum is "other"',
    },
  }, {
    sequelize,
    modelName: 'CollabReportDataUsed',
    tableName: 'CollabReportDataUsed',
    paranoid: true,
    timestamps: true, // enables createdAt and updatedAt
    indexes: [
      {
        name: 'collab_report_data_used_collab_report_datum_id_collab_report_id',
        unique: true,
        fields: ['collabReportId', 'collabReportDatum'],
      },
    ],
  });

  return CollabReportDataUsed;
};
