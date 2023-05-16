const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class TrainingReport extends Model {
    static associate(models) {
      TrainingReport.belongsTo(models.Event, { foreignKey: 'eventId', as: 'event' });
    }
  }

  TrainingReport.init({
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
    modelName: 'TrainingReport',
  });

  return TrainingReport;
};
