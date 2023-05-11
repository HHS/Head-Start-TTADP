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
      Report.hasOne(models.EventReport, {
        foreignKey: 'reportId',
        as: 'event',
        scope: { [sequelize.col('"Report".reportType')]: ENTITY_TYPE.REPORT_EVENT },
      });
      Report.hasOne(models.SessionReport, {
        foreignKey: 'reportId',
        as: 'session',
        scope: { [sequelize.col('"Report".reportType')]: ENTITY_TYPE.REPORT_SESSION },
      });

      Report.hasMany(models.ReportGoalTemplate, {
        foreignKey: 'reportId',
        as: 'reportGoalTemplates',
        scope: {
          [sequelize.col('"Report".reportType')]: {
            [Op.in]: [
              ENTITY_TYPE.REPORT_EVENT,
              ENTITY_TYPE.REPORT_SESSION,
            ],
          },
        },
      });

      // Report.hasMany(models.ReportObjectiveTemplate, {
      //   foreignKey: 'reportId',
      //   as: 'reportObjectiveTemplates',
      //   scope: {
      //     [sequelize.col('"Report".reportType')]: {
      //       [Op.in]: [
      //         ENTITY_TYPE.REPORT_SESSION,
      //       ],
      //     },
      //   },
      // });

      // Report.hasMany(models.ReportGoal, {
      //   foreignKey: 'reportId',
      //   as: 'reportGoals',
      //   scope: {
      //     [sequelize.col('"Report".reportType')]: {
      //       [Op.in]: [
      //         ENTITY_TYPE.REPORT_EVENT,
      //         ENTITY_TYPE.REPORT_SESSION,
      //       ],
      //     },
      //   },
      // });

      // Report.hasMany(models.ReportObjective, {
      //   foreignKey: 'reportId',
      //   as: 'reportObjectives',
      //   scope: {
      //     [sequelize.col('"Report".reportType')]: {
      //       [Op.in]: [
      //         ENTITY_TYPE.REPORT_SESSION,
      //       ],
      //     },
      //   },
      // });

      Report.hasOne(models.Status, { foreignKey: 'statusId', as: 'status' });
      Report.hasOne(models.ReportApproval, { // TODO: limit scope by report type
        foreignKey: 'reportId',
        as: 'reportApproval',
      });
      Report.hasMany(models.ReportCollaborator, {
        foreignKey: 'reportId',
        as: 'collaborators',
      });

      /*
      * Note: Associations located in reportCollaborator.js for:
      * ReportCollaborator as instantiator
      * ReportCollaborator as owner
      * ReportCollaborator as editors
      * ReportCollaborator as approvers
      * ReportCollaborator as poc
      */

      /*
      * Note: Associations located in ReportNationalCenter.js for:
      * ReportCollaborator as reportTrainers
      * NationalCenter as trainers
      */

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
          // {
          //   model: models.ReportObjectiveTemplate,
          //   as: 'reportObjectiveTemplates',
          // },
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
