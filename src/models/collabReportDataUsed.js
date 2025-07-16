const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class CollabReportDataUsed extends Model {
    static associate(models) {
      CollabReportDataUsed.belongsTo(models.CollabReport, { foreignKey: 'collabReportId', as: 'collabReport' });
    }
  }

  CollabReportDataUsed.init({
    collabReportId: {
      allowNull: false,
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'CollabReports',
        key: 'id',
      },
    },
    collabReportDatumId: {
      allowNull: false,
      type: DataTypes.STRING,
      primaryKey: true,
      comment: 'Data identifier - could be enum or FK to existing data dictionary',
    },
    collabReportDatumOther: {
      allowNull: true,
      type: DataTypes.STRING,
      comment: 'Required when collabReportDatumId is "OTHER"',
    },
  }, {
    sequelize,
    modelName: 'CollabReportDataUsed',
    tableName: 'CollabReportDataUsed',
    indexes: [
      {
        unique: true,
        fields: ['collabReportId', 'collabReportDatumId'],
      },
    ],
  });

  return CollabReportDataUsed;
};
