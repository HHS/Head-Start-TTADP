const {
  Model,
  Op,
} = require('sequelize');
const {
  REPORT_TYPE,
  NATIONAL_CENTER_ACTING_AS,
  COLLABORATOR_TYPES,
} = require('../constants');
const { formatDate } = require('../lib/modelHelpers');
const {
  beforeValidate,
  beforeUpdate,
  afterUpdate,
  afterCreate,
  beforeDestroy,
} = require('./hooks/report');
const {
  generateJunctionTableAssociations,
} = require('./helpers/associationsAndScopes');

export default (sequelize, DataTypes) => {
  class Report extends Model {
    static associate(models) {
      generateJunctionTableAssociations(
        models.Report,
        [
          models.Status,
          models.ValidFor,
        ],
        {
          models: [
            {
              scope: {
                method: ['validFor', null], // TODO: need to specify the right value
              },
              as: 'status',
            },
            {
              scope: 'reports',
              as: 'reportType',
            },
          ],
        },
      );

      // Report.hasOne(models.Status, {
      //   foreignKey: 'statusId',
      //   as: 'status',
      // });

      // // ValidFor aka reportType
      // models.Report.belongsTo(models.ValidFor.scope('reports'), {
      //   foreignKey: 'reportTypeId',
      //   as: 'reportType',
      // });

      // report scopes
      Report.addScope('defaultScope', {
        include: [{
          model: models.Status,
          as: 'status',
          required: true,
          attributes: [],
          where: {
            name: {
              [Op.ne]: 'deleted',
            },
          },
        }],
      });
      Report.addScope('reportType', (reportType) => ({
        include: [{
          attributes: [],
          model: models.ValidFor,
          as: 'reportType',
          required: true,
          where: {
            name: reportType,
          },
        }],
      }));
    }
  }
  Report.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    reportTypeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: {
          tableName: 'ValidFor',
        },
        key: 'id',
      },
    },
    statusId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: {
          tableName: 'Statuses',
        },
        key: 'id',
      },
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
    hooks: {
      beforeValidate: async (instance, options) => beforeValidate(sequelize, instance, options),
      afterCreate: async (instance, options) => afterCreate(sequelize, instance, options),
      beforeUpdate: async (instance, options) => beforeUpdate(sequelize, instance, options),
      afterUpdate: async (instance, options) => afterUpdate(sequelize, instance, options),
      beforeDestroy: async (instance, options) => afterUpdate(sequelize, instance, options),
    },
  });
  return Report;
};
