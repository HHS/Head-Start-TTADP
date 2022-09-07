const { Model } = require('sequelize');
const isEmail = require('validator/lib/isEmail');
const { USER_ROLES } = require('../constants');
const generateFullName = require('./hooks/user');

const featureFlags = [
  'recipient_goals_objectives',
];

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.belongsTo(models.Region, { foreignKey: { name: 'homeRegionId', allowNull: true }, as: 'homeRegion' });
      User.belongsToMany(models.Scope, {
        through: models.Permission, foreignKey: 'userId', as: 'scopes', timestamps: false,
      });
      User.hasMany(models.Permission, { foreignKey: 'userId', as: 'permissions' });
      User.hasMany(models.UserSettingOverrides, { foreignKey: 'userId', as: 'userSettingOverrides' });
      User.hasMany(models.ActivityReport, { foreignKey: 'userId', as: 'reports', hooks: true });
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
    role: DataTypes.ARRAY(DataTypes.ENUM(USER_ROLES)),
    flags: DataTypes.ARRAY(DataTypes.ENUM(featureFlags)),
    fullName: {
      type: DataTypes.VIRTUAL,
      get() {
        return generateFullName(this.name, this.role);
      },
    },
    lastLogin: DataTypes.DATE,
  }, {
    defaultScope: {
      order: [
        [sequelize.fn('CONCAT', sequelize.col('name'), sequelize.col('email')), 'ASC'],
      ],
    },
    sequelize,
    modelName: 'User',
  });
  return User;
};

module.exports.featureFlags = featureFlags;
