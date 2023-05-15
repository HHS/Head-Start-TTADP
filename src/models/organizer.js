const {
  Model,
} = require('sequelize');
const { ENTITY_TYPE } = require('../constants');

export default (sequelize, DataTypes) => {
  class Organizer extends Model {
    static associate(models) {
      Organizer.belongsTo(models.Organizer, {
        foreignKey: 'mapsTo',
        as: 'mapsToOrganizer',
      });
      Organizer.hasMany(models.Organizer, {
        foreignKey: 'mapsTo',
        as: 'mapsFromOrganizers',
      });
      Organizer.hasMany(models.EventReport, {
        foreignKey: 'organizerId',
        as: 'eventReports',
      });
      Organizer.belongsToMany(models.Report.scope(ENTITY_TYPE.REPORT_EVENT), {
        through: models.EventReport,
        foreignKey: 'organizerId',
        otherKey: 'reportId',
        as: 'reports',
      });

      models.EventReport.belongsTo(models.Organizer, {
        foreignKey: 'organizerId',
        as: 'organizer',
      });
      models.Report.scope(ENTITY_TYPE.REPORT_EVENT).belongsToMany(models.Organizer, {
        through: models.EventReport,
        foreignKey: 'reportId',
        otherKey: 'organizerId',
        as: 'organizer',
      });

      // TODO: make a scope to perform the mapTo automatically
    }
  }
  Organizer.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true,
    },
    validFor: {
      type: DataTypes.ENUM(Object.values(ENTITY_TYPE)),
      allowNull: false,
    },
    mapsTo: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'Organizer',
    paranoid: true,
  });
  return Organizer;
};
