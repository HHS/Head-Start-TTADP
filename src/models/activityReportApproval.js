const { Model } = require('sequelize');
const {
  beforeCreate,
  beforeUpdate,
  afterUpdate,
} = require('./hooks/activityReportApproval');
// const { validateSubmissionStatus } = require('./validation/approval');
const {
  ENTITY_TYPES,
  COLLABORATOR_TYPES,
  APPROVAL_RATIO,
  REPORT_STATUSES,
} = require('../constants');

export default (sequelize, DataTypes) => {
  class ActivityReportApproval extends Model {
    static associate(models) {
      ActivityReportApproval.belongsTo(models.ActivityReport, {
        scope: {
          entityType: ENTITY_TYPES.REPORT,
        },
        foreignKey: 'activityReportId',
        as: 'report',
        hooks: true,
      });
      ActivityReportApproval.hasMany(models.ActivityReportCollaborator, {
        scope: {
          where: {
            entityType: COLLABORATOR_TYPES.APPROVER,
          },
        },
        foreignKey: 'activityReportId',
        as: 'reportApprovers',
        hooks: true,
      });
    }
  }
  ActivityReportApproval.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    activityReportId: {
      allowNull: false,
      type: DataTypes.INTEGER,
    },
    ratioRequired: {
      allowNull: false,
      type: DataTypes
        .ENUM(Object.keys(APPROVAL_RATIO).map((k) => APPROVAL_RATIO[k])),
      default: APPROVAL_RATIO.ALL,
    },
    submissionStatus: {
      allowNull: false,
      type: DataTypes
        .ENUM(Object.keys(REPORT_STATUSES).map((k) => REPORT_STATUSES[k])),
      // validate: {
      //   runValidators() { validateSubmissionStatus(this); },
      // },
    },
    calculatedStatus: {
      allowNull: true,
      type: DataTypes
        .ENUM(Object.keys(REPORT_STATUSES).map((k) => REPORT_STATUSES[k])),
    },
    firstSubmittedAt: {
      allowNull: true,
      type: DataTypes.DATE,
    },
    submittedAt: {
      allowNull: true,
      type: DataTypes.DATE,
    },
    approvedAt: {
      allowNull: true,
      type: DataTypes.DATE,
    },
    createdAt: {
      allowNull: false,
      defaultValue: DataTypes.fn('NOW'),
      type: DataTypes.DATE,
    },
    updatedAt: {
      allowNull: false,
      defaultValue: DataTypes.fn('NOW'),
      type: DataTypes.DATE,
    },
    deletedAt: {
      allowNull: true,
      type: DataTypes.DATE,
    },
    isApproved: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.calculatedStatus === REPORT_STATUSES.APPROVED;
      },
    },
  }, {
    hooks: {
      beforeCreate: async (instance, options) => beforeCreate(sequelize, instance, options),
      beforeUpdate: async (instance, options) => beforeUpdate(sequelize, instance, options),
      afterUpdate: async (instance, options) => afterUpdate(sequelize, instance, options),
    },
    // indexes: [{
    //   unique: true,
    //   fields: ['activityReportId', 'userId'],
    // }],
    sequelize,
    paranoid: false,
    modelName: 'ActivityReportApproval',
  });
  return ActivityReportApproval;
};
