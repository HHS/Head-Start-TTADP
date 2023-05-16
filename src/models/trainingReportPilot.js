const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class TrainingReportPilot extends Model {
    static associate(models) {
      TrainingReportPilot.belongsTo(models.Event, { foreignKey: 'eventId', as: 'event' });
    }
  }

  TrainingReportPilot.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    eventId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    data: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'TrainingReportPilot',
  });

  return TrainingReportPilot;
};
