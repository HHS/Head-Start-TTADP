const { Model } = require('sequelize');
const isEmail = require('validator/lib/isEmail');
const generateFullName = require('./helpers/generateFullName');

const featureFlags = [
  'resources_dashboard',
];

export default (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.belongsTo(models.Region, { foreignKey: { name: 'homeRegionId', allowNull: true }, as: 'homeRegion' });
      User.belongsToMany(models.Scope, {
        through: models.Permission, foreignKey: 'userId', as: 'scopes', timestamps: false,
      });
      User.hasMany(models.Permission, { foreignKey: 'userId', as: 'permissions' });
      User.belongsToMany(models.Role, {
        through: models.UserRole,
        otherKey: 'roleId',
        foreignKey: 'userId',
        as: 'roles',
      });
      User.hasMany(models.UserSettingOverrides, { foreignKey: 'userId', as: 'userSettingOverrides' });
      User.hasMany(models.ActivityReport, { foreignKey: 'userId', as: 'reports', hooks: true });
      User.hasMany(models.UserValidationStatus, { foreignKey: 'userId', as: 'validationStatus' });
      User.hasMany(models.Group, { foreignKey: 'userId', as: 'groups' });
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
      allowNull: false,
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
    flags: DataTypes.ARRAY(DataTypes.ENUM(featureFlags)),
    fullName: {
      type: DataTypes.VIRTUAL,
      get() {
        return generateFullName(this.name, this.roles);
      },
    },
    lastLogin: DataTypes.DATE,
  }, {
    sequelize,
    modelName: 'User',
  });
  return User;
};

export {
  featureFlags,
};
