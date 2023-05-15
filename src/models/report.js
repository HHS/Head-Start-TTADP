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
      Report.addScope(ENTITY_TYPE.REPORT_SESSION, {
        where: {
          reportType: ENTITY_TYPE.REPORT_SESSION,
        },
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
      type: DataTypes.ENUM(
        Object.values(ENTITY_TYPE)
          .filter((et) => et.startsWith('report.')),
      ),
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
    currentStatus: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.status ? this.status.name : null;
      },
      async set(value) {
        const status = await sequelize.models.Status
          .scope({ method: ['validFor', this.reportType] })
          .findOne({ where: { name: value } });
        if (status) {
          this.setDataValue('statusId', status.id);
        } else {
          throw new Error(`Invalid status name of ${value} for report of type ${this.reportType}.`);
        }
      },
    },
  }, {
    sequelize,
    modelName: 'Report',
  });
  return Report;
};
