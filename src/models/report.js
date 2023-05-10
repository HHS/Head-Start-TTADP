const {
  Model,
  Op,
} = require('sequelize');
const { ENTITY_TYPE, NATIONAL_CENTER_ACTING_AS } = require('../constants');
const { formatDate } = require('../lib/modelHelpers');

/**
 * Status table. Stores topics used in activity reports and tta plans.
 *
 * @param {} sequelize
 * @param {*} DataTypes
 */
export default (sequelize, DataTypes) => {
  class Report extends Model {
    static associate(models) {
      Report.hasOne(models.Status, { foreignKey: 'statusId', as: 'status' });
      Report.hasOne(models.ReportApproval, { foreignKey: 'reportId', as: 'reportApproval' }); // TODO: limit scope by report type
      Report.hasMany(models.ReportNationalCenter, {
        foreignKey: 'reportId',
        as: NATIONAL_CENTER_ACTING_AS.TRAINER,
        scope: { actingAs: NATIONAL_CENTER_ACTING_AS.TRAINER }, // TODO: make sure this is working, limit scope by report type
      });
      Report.belongsToMany(models.NationalCenter, {
        through: models.ReportNationalCenter,
        foreignKey: 'reportId',
        otherKey: 'nationalCenterId',
        as: `${NATIONAL_CENTER_ACTING_AS.TRAINER}s`,
        scope: { actingAs: NATIONAL_CENTER_ACTING_AS.TRAINER },  // TODO: make sure this is working, limit scope by report type
      });
      Report.hasMany(models.ReportReason, {
        foreignKey: 'reportId',
        as: 'reportReasons', // TODO: limit scope by report type
        scope: { reportType: ENTITY_TYPE.REPORT_EVENT },
      });
      Report.belongsToMany(models.Reason, {
        through: models.ReportReason,
        foreignKey: 'reportId',
        otherKey: 'reasonId',
        as: 'reasons', // TODO: limit scope by report type
        scope: { reportType: ENTITY_TYPE.REPORT_EVENT },
      });
      Report.hasMany(models.ReportTargetPopulation, {
        foreignKey: 'reportId',
        as: 'reportTargetPopulations', // TODO: limit scope by report type
        scope: { reportType: ENTITY_TYPE.REPORT_EVENT },
      });
      Report.belongsToMany(models.TargetPopulation, {
        through: models.ReportTargetPopulation,
        foreignKey: 'reportId',
        otherKey: 'targetPopulationId',
        as: 'targetPopulations', // TODO: limit scope by report type
        scope: { reportType: ENTITY_TYPE.REPORT_EVENT },
      });
      Report.addScope('defaultScope', {
        include: [{
          model: models.ReportApproval,
          as: 'approval',
          required: true,
          where: {
            submissionStatus: {
              [Op.ne]: 'deleted',
            },
          },
        }],
      });
      Report.addScope('event', {
        include: [
          {
            model: models.ReportApproval,
            as: 'approval',
            required: true,
            where: {
              submissionStatus: {
                [Op.ne]: 'deleted',
              },
            },
          },
          {
            model: models.EventReport,
            as: 'eventReport',
          },
          {
            model: models.Reason,
            as: 'reasons',
            through: {
              attributes: [],
            },
          },
          {
            model: models.TargetPopulation,
            as: 'targetPopulations',
            through: {
              attributes: [],
            },
          },
          {
            model: models.ReportGoalTemplate,
            as: 'reportGoalTemplates',
          },
        ],
      });
      Report.addScope('session', {
        include: [
          {
            model: models.ReportApproval,
            as: 'approval',
            required: true,
            where: {
              submissionStatus: {
                [Op.ne]: 'deleted',
              },
            },
          },
          {
            model: models.SessionReport,
            as: 'sessionReport',
          },
          {
            model: models.ReportRecipients,
            as: 'reportRecipients',
          },
          {
            model: models.ReportObjectiveTemplate,
            as: 'reportObjectiveTemplates',
          },
        ],
      });
    }
  }
  Report.init({
    id: {
      type: DataTypes.INTEGER,
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
