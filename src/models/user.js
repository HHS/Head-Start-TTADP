import { Model } from 'sequelize';

const roles = [
  'Regional Program Manager',
  'COR',
  'Supervisory Program Specialist',
  'Program Specialist',
  'Grants Specialist',
  'Central Office',
  'TTAC',
  'Admin. Assistant',
  'Early Childhood Manager',
  'Early Childhood Specialist',
  'Family Engagement Specialist',
  'Grantee Specialist Manager',
  'Grantee Specialist',
  'Health Specialist',
  'System Specialist',
];

export default (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.belongsTo(models.Region, { foreignKey: { name: 'homeRegionId', allowNull: true }, as: 'homeRegion' });
      User.belongsToMany(models.Scope, {
        through: models.Permission, foreignKey: 'userId', as: 'scopes', timestamps: false,
      });
      User.hasMany(models.Permission, { foreignKey: 'userId', as: 'permissions' });
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
    },
    name: DataTypes.STRING,
    phoneNumber: DataTypes.STRING,
    email: {
      type: DataTypes.STRING,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    role: DataTypes.ENUM(roles),
    fullName: {
      type: DataTypes.VIRTUAL,
      get() {
        return `${this.name}, ${this.role}`;
      },
    },
  }, {
    sequelize,
    modelName: 'User',
  });
  return User;
};
