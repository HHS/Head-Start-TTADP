const { Model, Op } = require('sequelize')
const { afterCreate, afterUpdate, beforeDestroy, afterDestroy } = require('./hooks/grant')

const { GRANT_INACTIVATION_REASONS } = require('../constants')

const inactivationReasons = Object.values(GRANT_INACTIVATION_REASONS)

export default (sequelize, DataTypes) => {
  class Grant extends Model {
    static associate(models) {
      Grant.belongsTo(models.Region, { foreignKey: 'regionId', as: 'region' })
      Grant.belongsTo(models.Recipient, { foreignKey: 'recipientId', as: 'recipient' })
      Grant.hasMany(models.Goal, { foreignKey: 'grantId', as: 'goals' })
      Grant.hasMany(models.GroupGrant, { foreignKey: 'grantId', as: 'groupGrants' })
      Grant.hasMany(models.ProgramPersonnel, { foreignKey: 'grantId', as: 'programPersonnel' })
      Grant.belongsToMany(models.Group, {
        through: models.GroupGrant,
        foreignKey: 'grantId',
        otherKey: 'groupId',
        as: 'groups',
      })
      Grant.hasMany(models.Program, { foreignKey: 'grantId', as: 'programs' })
      Grant.hasMany(models.ActivityRecipient, { foreignKey: 'grantId', as: 'activityRecipients' })
      Grant.belongsToMany(models.ActivityReport, {
        through: models.ActivityRecipient,
        foreignKey: 'grantId',
        otherKey: 'activityReportId',
        as: 'activityReports',
      })
      // Session Report Pilot Grants.
      Grant.hasMany(models.SessionReportPilotGrant, { foreignKey: 'grantId', as: 'sessionGrants' })
      Grant.belongsToMany(models.SessionReportPilot, {
        through: models.SessionReportPilotGrant,
        foreignKey: 'grantId',
        otherKey: 'sessionReportPilotId',
        as: 'sessionReports',
      })

      Grant.addScope('defaultScope', {
        include: [{ model: models.Recipient, as: 'recipient' }],
      })
    }
  }
  Grant.init(
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: null,
        primaryKey: true,
        autoIncrement: false,
      },
      number: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      annualFundingMonth: DataTypes.STRING,
      cdi: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      status: DataTypes.STRING,
      granteeName: DataTypes.STRING,
      grantSpecialistName: DataTypes.STRING,
      grantSpecialistEmail: DataTypes.STRING,
      programSpecialistName: DataTypes.STRING,
      programSpecialistEmail: DataTypes.STRING,
      stateCode: DataTypes.STRING,
      startDate: DataTypes.DATE,
      endDate: DataTypes.DATE,
      inactivationDate: DataTypes.DATE,
      inactivationReason: DataTypes.ENUM(inactivationReasons),
      geographicRegion: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      geographicRegionId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      recipientId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      deleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      programTypes: {
        type: DataTypes.VIRTUAL,
        get() {
          return this.programs && this.programs.length > 0
            ? [
                ...new Set(
                  this.programs
                    .filter((p) => p.programType)
                    .map((p) => p.programType)
                    .sort()
                ),
              ]
            : []
        },
      },
      name: {
        type: DataTypes.VIRTUAL,
        get() {
          const statusText = this.status === 'Inactive' ? ' (inactive)' : ''

          if (this.recipient) {
            return `${this.recipient.name} - ${this.numberWithProgramTypes}${statusText}`
          }

          return `${this.numberWithProgramTypes}${statusText}`
        },
      },
      numberWithProgramTypes: {
        type: DataTypes.VIRTUAL,
        get() {
          const programTypes = this.programTypes.length > 0 ? ` - ${this.programTypes.join(', ')}` : ''
          return `${this.number}${programTypes}`
        },
      },
      recipientInfo: {
        type: DataTypes.VIRTUAL,
        get() {
          return this.recipient ? `${this.recipient.name} - ${this.number} - ${this.recipientId}` : `${this.number} - ${this.recipientId}`
        },
      },
      recipientNameWithPrograms: {
        type: DataTypes.VIRTUAL,
        get() {
          const programsList = this.programTypes.length > 0 ? `${this.programTypes.join(', ')}` : ''
          return this.recipient
            ? `${this.recipient.name} - ${this.number}${programsList ? ` - ${programsList}` : ''}`
            : `${this.number} - ${this.recipientId}`
        },
      },
    },
    {
      sequelize,
      modelName: 'Grant',
      hooks: {
        afterCreate: async (instance, options) => afterCreate(sequelize, instance, options),
        afterUpdate: async (instance, options) => afterUpdate(sequelize, instance, options),
        beforeDestroy: async (instance, options) => beforeDestroy(sequelize, instance, options),
        afterDestroy: async (instance, options) => afterDestroy(sequelize, instance, options),
      },
    }
  )
  return Grant
}
