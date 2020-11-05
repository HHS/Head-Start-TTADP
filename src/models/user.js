import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.belongsTo(models.Region, { foreignKey: 'homeRegionId', as: 'homeRegion' });
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
    hsesUserId: {
      type: DataTypes.STRING,
      unique: true,
    },
    name: DataTypes.STRING,
    phoneNumber: DataTypes.STRING,
    email: {
      type: DataTypes.STRING,
      validate: {
        isEmail: true,
      },
    },
    title: DataTypes.ENUM('Program Specialist', 'Early Childchood Specialist', 'Grantee Specialist', 'Family Engagement Specialist', 'Health Specialist', 'Systems Specialist'),
  }, {
    sequelize,
    modelName: 'User',
  });
  return User;
};
