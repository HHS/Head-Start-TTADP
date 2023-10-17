const {
  Model,
} = require('sequelize');
const { REPORT_TYPE, NEXTSTEP_NOTETYPE } = require('../constants');
const { formatDate } = require('../lib/modelHelpers');
const { generateJunctionTableAssociations } = require('./helpers/associationsAndScopes');
const {
  beforeValidate,
  beforeUpdate,
  afterUpdate,
  afterCreate,
  beforeDestroy,
} = require('./hooks/reportNextStep');

export default (sequelize, DataTypes) => {
  class ReportNextStep extends Model {
    static async associate(models) {
      this.addScope('noteType', (noteType) => ({ where: { noteType } }));

      await generateJunctionTableAssociations(
        this,
        [
          models.Report,
        ],
        {
          suffixes: Object.values(NEXTSTEP_NOTETYPE).map((noteType) => noteType.toLowerCase()),
          scopes: Object.values(NEXTSTEP_NOTETYPE).map((noteType) => ({ method: ['noteType', noteType] })),
        },
      );
    }
  }
  ReportNextStep.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    reportId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: {
          tableName: 'Reports',
        },
        key: 'id',
      },
    },
    note: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    noteType: {
      type: DataTypes.ENUM(Object.values(NEXTSTEP_NOTETYPE)),
      allowNull: false,
    },
    completedDate: {
      type: DataTypes.DATEONLY,
      get: formatDate,
      allowNull: true,
    },
  }, {
    hooks: {
      beforeValidate: async (instance, options) => beforeValidate(sequelize, instance, options),
      afterCreate: async (instance, options) => afterCreate(sequelize, instance, options),
      beforeUpdate: async (instance, options) => beforeUpdate(sequelize, instance, options),
      afterUpdate: async (instance, options) => afterUpdate(sequelize, instance, options),
      beforeDestroy: async (instance, options) => afterUpdate(sequelize, instance, options),
    },
    sequelize,
    modelName: 'ReportNextStep',
  });
  return ReportNextStep;
};
