const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class CollabReportReason extends Model {
    static associate(models) {
      CollabReportReason.belongsTo(models.CollabReport, { foreignKey: 'collabReportId', as: 'collabReport' });
    }
  }

  CollabReportReason.init({
    collabReportId: {
      allowNull: false,
      type: DataTypes.INTEGER,
      primaryKey: true,
      references: {
        model: 'CollabReports',
        key: 'id',
      },
    },
    reasonId: {
      allowNull: false,
      type: DataTypes.ENUM([
        'PARTICIPATE_WORK_GROUPS',
        'SUPPORT_COORDINATION',
        'AGG_REGIONAL_DATA',
        'DEVELOP_PRESENTATIONS',
      ]),
      primaryKey: true,
    },
  }, {
    sequelize,
    modelName: 'CollabReportReason',
    tableName: 'CollabReportReasons',
    indexes: [
      {
        unique: true,
        fields: ['collabReportId', 'reasonId'],
      },
    ],
  });

  return CollabReportReason;
};
