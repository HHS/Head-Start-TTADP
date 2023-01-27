const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class UserSettingOverrides extends Model {
    static associate(models) {
      UserSettingOverrides.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
      UserSettingOverrides.belongsTo(models.UserSettings, { foreignKey: 'userSettingId', as: 'setting' });
    }
  }

  UserSettingOverrides.init(
    {
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: { tableName: 'Users' }, key: 'id' },
      },
      userSettingId: { type: DataTypes.INTEGER, allowNull: false },
      value: { type: DataTypes.STRING, allowNull: false },
    },
    { sequelize, modelName: 'UserSettingOverrides' },
  );

  return UserSettingOverrides;
};
