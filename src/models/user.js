const { Model } = require('sequelize');
const isEmail = require('validator/lib/isEmail');
const generateFullName = require('./helpers/generateFullName');
const { FEATURE_FLAGS } = require('../constants');

export default (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.belongsTo(models.Region, { foreignKey: { name: 'homeRegionId', allowNull: true }, as: 'homeRegion' });
      User.belongsToMany(models.Scope, {
        through: models.Permission, foreignKey: 'userId', as: 'scopes', timestamps: false,
      });
      User.hasMany(models.Permission, { foreignKey: 'userId', as: 'permissions' });
      User.hasMany(models.UserRole, { foreignKey: 'userId', as: 'userRoles' });
      User.belongsToMany(models.Role, {
        through: models.UserRole,
        otherKey: 'roleId',
        foreignKey: 'userId',
        as: 'roles',
      });
      User.hasMany(models.UserSettingOverrides, { foreignKey: 'userId', as: 'userSettingOverrides' });
      User.hasMany(models.ActivityReport, { foreignKey: 'userId', as: 'reports', hooks: true });
      User.hasMany(models.ActivityReportApprover, { foreignKey: 'userId', as: 'reportApprovers', hooks: true });
      User.hasMany(models.ActivityReportCollaborator, { foreignKey: 'userId', as: 'reportCollaborators', hooks: true });
      User.hasMany(models.UserValidationStatus, { foreignKey: 'userId', as: 'validationStatus' });
      User.hasMany(models.SiteAlert, { foreignKey: 'userId', as: 'siteAlerts' });
      User.hasMany(models.CommunicationLog, { foreignKey: 'userId', as: 'communicationLogs' });

      // User can belong to a national center through a national center user.
      User.hasMany(models.NationalCenterUser, { foreignKey: 'userId', as: 'nationalCenterUsers' });
      User.belongsToMany(models.NationalCenter, { through: models.NationalCenterUser, foreignKey: 'userId', as: 'nationalCenters' });
    }
  }
  User.init({
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
            return next();
          }
          return next('email is invalid');
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
        return generateFullName(this.name, this.roles);
      },
    },
    nameWithNationalCenters: {
      type: DataTypes.VIRTUAL,
      get() {
        const centers = `, ${(this.nationalCenters || []).map((center) => center.name).join(', ')}`;
        return `${this.name}${centers}`;
      },
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('now()'),
    },
  }, {
    sequelize,
    modelName: 'User',
  });
  return User;
};
