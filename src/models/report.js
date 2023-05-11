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
      Report.hasMany(models.reportCollaborators, {
        foreignKey: 'reportId',
        as: 'collaborators',
      });
      Report.hasOne(models.reportCollaborators.scope(COLLABORATOR_TYPES.INSTANTIATOR), {
        foreignKey: 'reportId',
        as: COLLABORATOR_TYPES.INSTANTIATOR,
      });
      Report.hasOne(models.reportCollaborators.scope(COLLABORATOR_TYPES.OWNER), {
        foreignKey: 'reportId',
        as: COLLABORATOR_TYPES.OWNER,
      });
      Report.hasMany(models.reportCollaborators.scope(COLLABORATOR_TYPES.EDITOR), {
        foreignKey: 'reportId',
        as: `${COLLABORATOR_TYPES.EDITOR}s`,
      });
      Report.hasMany(models.reportCollaborators.scope(COLLABORATOR_TYPES.APPROVER), {
        foreignKey: 'reportId',
        as: `${COLLABORATOR_TYPES.APPROVER}s`, // TODO: limit scope by report type
      });
      Report.hasOne(models.reportCollaborators.scope(COLLABORATOR_TYPES.POC), {
        foreignKey: 'reportId',
        as: COLLABORATOR_TYPES.POC, // TODO: limit scope by report type
      });
      Report.hasMany(models.ReportNationalCenter.scope(NATIONAL_CENTER_ACTING_AS.TRAINER), {
        foreignKey: 'reportId',
        as: 'reportTrainers',
        scope: { [sequelize.col('"Report".reportType')]: ENTITY_TYPE.REPORT_SESSION },
      });
      Report.belongsToMany(models.NationalCenter, {
        through: models.ReportNationalCenter.scope(NATIONAL_CENTER_ACTING_AS.TRAINER),
        foreignKey: 'reportId',
        otherKey: 'nationalCenterId',
        as: 'trainers',
        scope: { [sequelize.col('"Report".reportType')]: ENTITY_TYPE.REPORT_SESSION },
      });
      Report.hasMany(models.ReportReason, {
        foreignKey: 'reportId',
        as: 'reportReasons',
        scope: { [sequelize.col('"Report".reportType')]: ENTITY_TYPE.REPORT_EVENT },
      });
      Report.belongsToMany(models.Reason, {
        through: models.ReportReason,
        foreignKey: 'reportId',
        otherKey: 'reasonId',
        as: 'reasons',
        scope: { [sequelize.col('"Report".reportType')]: ENTITY_TYPE.REPORT_EVENT },
      });
      Report.hasMany(models.ReportTargetPopulation, {
        foreignKey: 'reportId',
        as: 'reportTargetPopulations',
        scope: {
          [Op.and]: {
            validFor: sequelize.col('"Report".reportType'),
            [sequelize.col('"Report".reportType')]: ENTITY_TYPE.REPORT_EVENT,
          },
        },
      });
      Report.belongsToMany(models.TargetPopulation, {
        through: models.ReportTargetPopulation,
        foreignKey: 'reportId',
        otherKey: 'targetPopulationId',
        as: 'targetPopulations',
        scope: {
          [Op.and]: {
            validFor: sequelize.col('"Report".reportType'),
            [sequelize.col('"Report".reportType')]: ENTITY_TYPE.REPORT_EVENT,
          },
        },
      });
      Report.addScope('defaultScope', { // TODO: switch to statusId and not approval
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
        where: {
          reportType: ENTITY_TYPE.REPORT_EVENT,
        },
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
        where: {
          reportType: ENTITY_TYPE.REPORT_SESSION,
        },
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
