const { Model } = require('sequelize')
const isEmail = require('validator/lib/isEmail')
const generateFullName = require('./helpers/generateFullName')
const { FEATURE_FLAGS } = require('../constants')

export default (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.belongsTo(models.Region, {
        foreignKey: { name: 'homeRegionId', allowNull: true },
        as: 'homeRegion',
      })
      User.belongsToMany(models.Scope, {
        through: models.Permission,
        foreignKey: 'userId',
        as: 'scopes',
        timestamps: false,
      })
      User.hasMany(models.Permission, { foreignKey: 'userId', as: 'permissions' })
      User.hasMany(models.UserRole, { foreignKey: 'userId', as: 'userRoles' })
      User.belongsToMany(models.Role, {
        through: models.UserRole,
        otherKey: 'roleId',
        foreignKey: 'userId',
        as: 'roles',
      })
      User.hasMany(models.UserSettingOverrides, {
        foreignKey: 'userId',
        as: 'userSettingOverrides',
      })
      User.hasMany(models.ActivityReport, { foreignKey: 'userId', as: 'reports', hooks: true })
      User.hasMany(models.ActivityReportApprover, {
        foreignKey: 'userId',
        as: 'reportApprovers',
        hooks: true,
      })
      User.hasMany(models.CollabReportApprover, {
        foreignKey: 'userId',
        as: 'collabReportApprovers',
        hooks: true,
      })
      User.hasMany(models.ActivityReportCollaborator, {
        foreignKey: 'userId',
        as: 'reportCollaborators',
        hooks: true,
      })
      User.hasMany(models.UserValidationStatus, { foreignKey: 'userId', as: 'validationStatus' })
      User.hasMany(models.SiteAlert, { foreignKey: 'userId', as: 'siteAlerts' })
      User.hasMany(models.CommunicationLog, { foreignKey: 'userId', as: 'communicationLogs' })

      // User can belong to a national center through a national center user.
      User.hasMany(models.NationalCenterUser, { foreignKey: 'userId', as: 'nationalCenterUsers' })
      User.belongsToMany(models.NationalCenter, {
        through: models.NationalCenterUser,
        foreignKey: 'userId',
        as: 'nationalCenters',
      })
      User.hasMany(models.CollabReportSpecialist, {
        foreignKey: 'specialistId',
        as: 'collabReportSpecialists',
      })
      User.belongsToMany(models.CollabReport, {
        through: models.CollabReportSpecialist,
        foreignKey: 'specialistId',
        otherKey: 'collabReportId',
        as: 'collabReports',
      })
      User.hasMany(models.CollabReportApprover, {
        foreignKey: 'userId',
        as: 'approvers',
        hooks: true,
      })
      // Session Report Pilot Trainers.
      User.hasMany(models.SessionReportPilotTrainer, {
        foreignKey: 'userId',
        as: 'sessionTrainers',
      })
      User.belongsToMany(models.SessionReportPilot, {
        through: models.SessionReportPilotTrainer,
        foreignKey: 'userId',
        otherKey: 'sessionReportPilotId',
        as: 'sessionReports',
      })
      // Session Report Pilot Approver.
      User.hasMany(models.SessionReportPilot, {
        foreignKey: 'approverId',
        as: 'sessionReportsAsApprover',
      })
    }
  }
  User.init(
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: null,
        comment: null,
        primaryKey: true,
        autoIncrement: true,
      },
      homeRegionId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      hsesUserId: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: true,
      },
      hsesUsername: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      hsesAuthorities: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
      },
      name: DataTypes.STRING,
      phoneNumber: DataTypes.STRING,
      email: {
        type: DataTypes.STRING,
        unique: true,
        validate: {
          isEmailOrEmpty(value, next) {
            if (!value || value === '' || isEmail(value)) {
              return next()
            }
            return next('email is invalid')
          },
        },
      },
      flags: {
        type: DataTypes.ARRAY(DataTypes.ENUM(FEATURE_FLAGS)),
        defaultValue: sequelize.literal('ARRAY[]::"enum_Users_flags"[]'),
      },
      fullName: {
        type: DataTypes.VIRTUAL,
        get() {
          return generateFullName(this.name, this.roles)
        },
      },
      nameWithNationalCenters: {
        type: DataTypes.VIRTUAL,
        get() {
          const centers = `, ${(this.nationalCenters || []).map((center) => center.name).join(', ')}`
          return `${this.fullName}${centers}`
        },
      },
      lastLogin: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('now()'),
      },
    },
    {
      sequelize,
      modelName: 'User',
    }
  )
  return User
}
