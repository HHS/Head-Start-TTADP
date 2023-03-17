const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class UserSettings extends Model {
    static associate(models) {
      UserSettings.hasMany(models.UserSettingOverrides, { foreignKey: 'userSettingId', as: 'userSettingOverrides' });
    }
  }

  UserSettings.init(
    {
      key: { type: DataTypes.STRING, allowNull: false },
      default: { type: DataTypes.STRING, allowNull: false },
    },
    { sequelize, modelName: 'UserSettings' },
  );

  return UserSettings;
};
