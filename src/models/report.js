const {
  Model,
  Op,
} = require('sequelize');
const {
  ENTITY_TYPE,
  NATIONAL_CENTER_ACTING_AS,
  COLLABORATOR_TYPES,
} = require('../constants');
const { formatDate } = require('../lib/modelHelpers');

export default (sequelize, DataTypes) => {
  class Report extends Model {
    static associate(models) {
      Report.hasOne(models.Status, {
        foreignKey: 'statusId',
        as: 'status',
      });

      Report.addScope('defaultScope', {
        include: [{
          model: models.Status,
          as: 'status',
          required: true,
          where: {
            name: {
              [Op.ne]: 'deleted',
            },
          },
        }],
      });
    }
  }
  Report.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    reportType: {
      type: DataTypes.ENUM(Object.values(ENTITY_TYPE).filter((et) => et.startsWith('report.'))),
      allowNull: false,
    },
    statusId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    context: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    startDate: {
      type: DataTypes.DATEONLY,
      get: formatDate,
    },
    endDate: {
      type: DataTypes.DATEONLY,
      get: formatDate,
    },
  }, {
    sequelize,
    modelName: 'Report',
  });
  return Report;
};
