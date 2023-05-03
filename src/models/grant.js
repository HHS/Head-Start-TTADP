const {
  Model, Op,
} = require('sequelize');

const { GRANT_INACTIVATION_REASONS } = require('../constants');

const inactivationReasons = Object.values(GRANT_INACTIVATION_REASONS);

/**
 * Grants table. Stores grants.
 *
 * @param {} sequelize
 * @param {*} DataTypes
 */
export default (sequelize, DataTypes) => {
  class Grant extends Model {
    static associate(models) {
      Grant.belongsTo(models.Region, { foreignKey: 'regionId', as: 'region' });
      Grant.belongsTo(models.Recipient, { foreignKey: 'recipientId', as: 'recipient' });
      Grant.hasMany(models.Goal, { foreignKey: 'grantId', as: 'goals' });
      Grant.hasMany(models.GroupGrant, { foreignKey: 'grantId', as: 'groupGrants' });
      Grant.belongsToMany(models.Group, {
        through: models.GroupGrant,
        foreignKey: 'grantId',
        otherKey: 'groupId',
        as: 'groups',
      });
      Grant.hasMany(models.Program, { foreignKey: 'grantId', as: 'programs' });
      Grant.hasMany(models.ActivityRecipient, { foreignKey: 'grantId', as: 'activityRecipients' });
      Grant.belongsToMany(models.ActivityReport, {
        through: models.ActivityRecipient,
        foreignKey: 'grantId',
        otherKey: 'activityReportId',
        as: 'activityReports',
      });
      Grant.hasMany(models.Grant, { foreignKey: 'oldGrantId', as: 'oldGrants' });
      Grant.belongsTo(models.Grant, { foreignKey: 'oldGrantId', as: 'grant' });

      Grant.addScope('defaultScope', {
        include: [
          { model: models.Recipient, as: 'recipient' },
        ],
      });
    }
  }
  Grant.init({
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
      /*
        We're not setting unique true here to allow
        bulkCreate/updateOnDuplicate to properly match rows on just the id.
        unique: true,
      */
    },
    annualFundingMonth: DataTypes.STRING,
    cdi: DataTypes.BOOLEAN,
    status: DataTypes.STRING,
    grantSpecialistName: DataTypes.STRING,
    grantSpecialistEmail: DataTypes.STRING,
    programSpecialistName: DataTypes.STRING,
    programSpecialistEmail: DataTypes.STRING,
    stateCode: DataTypes.STRING,
    startDate: DataTypes.DATE,
    endDate: DataTypes.DATE,
    inactivationDate: DataTypes.DATE,
    inactivationReason: DataTypes.ENUM(inactivationReasons),
    recipientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    oldGrantId: DataTypes.INTEGER,
    deleted: {
      type: DataTypes.BOOLEAN,
    },
    programTypes: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.programs && this.programs.length > 0 ? [
          ...new Set(
            this.programs.filter((p) => (p.programType))
              .map((p) => (p.programType)).sort(),
          )] : [];
      },
    },
    name: {
      type: DataTypes.VIRTUAL,
      get() {
        if (this.recipient) {
          return `${this.recipient.name} - ${this.numberWithProgramTypes}`;
        }
        return `${this.numberWithProgramTypes}`;
      },
    },
    numberWithProgramTypes: {
      type: DataTypes.VIRTUAL,
      get() {
        const programTypes = this.programTypes.length > 0 ? ` - ${this.programTypes.join(', ')}` : '';
        return `${this.number} ${programTypes}`;
      },
    },
    recipientInfo: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.recipient
          ? `${this.recipient.name} - ${this.number} - ${this.recipientId}`
          : `${this.number} - ${this.recipientId}`;
      },
    },
  }, {
  //   defaultScope: {
  //     where: {
  //       deleted: false
  //     }
  //   },
  // },
  // {
    sequelize,
    modelName: 'Grant',
  });
  return Grant;
};
