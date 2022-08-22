const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class UserSetting extends Model {
    static associate(models) {
      UserSetting.belongsTo(models.User, { foreignKey: 'userId' });
    }
  }

  UserSetting.init(
    {
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: { tableName: 'users' }, key: 'id' },
        onUpdate: 'CASCADE',
      },
      key: { type: DataTypes.STRING, allowNull: false },
      value: { type: DataTypes.STRING, allowNull: false },
    },
    { sequelize, modelName: 'UserSetting' },
  );

  return UserSetting;
};
