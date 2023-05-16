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

      models.Organizer.addScope('defaultScope', {
        include: [{
          model: models.Organizer,
          as: 'mapsToOrganizer',
          required: false,
        }],
      });
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
    },
    validFor: {
      type: DataTypes.ENUM(Object.values(ENTITY_TYPE)),
      allowNull: false,
    },
    mapsTo: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    latestName: {
      type: DataTypes.VIRTUAL(DataTypes.STRING),
      get() {
        return this.get('mapsTo')
          ? this.get('mapsToOrganizer').get('name')
          : this.get('name');
      },
    },
    latestId: {
      type: DataTypes.VIRTUAL(DataTypes.INTEGER),
      get() {
        return this.get('mapsTo')
          ? this.get('mapsToOrganizer').get('id')
          : this.get('id');
      },
    },
  }, {
    sequelize,
    modelName: 'Organizer',
    paranoid: true,
  });
  return Organizer;
};
