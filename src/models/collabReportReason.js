const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class CollabReportReason extends Model {
    static associate(models) {
      CollabReportReason.belongsTo(models.CollabReport, { foreignKey: 'collabReportId', as: 'collabReport' });
    }
  }

  CollabReportReason.init({
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
    reasonId: {
      allowNull: false,
      type: DataTypes.ENUM([
        'participate_work_groups',
        'support_coordination',
        'agg_regional_data',
        'develop_presentations',
      ]),
    },
  }, {
    sequelize,
    modelName: 'CollabReportReason',
    tableName: 'CollabReportReasons',
    paranoid: true,
    timestamps: true,
    indexes: [
      {
        name: 'collab_report_reasons_reason_id_collab_report_id',
        unique: true,
        fields: ['collabReportId', 'reasonId'],
      },
    ],
  });

  return CollabReportReason;
};
