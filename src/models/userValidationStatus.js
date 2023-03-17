const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class UserValidationStatus extends Model {
    static associate(models) {
      UserValidationStatus.belongsTo(models.User, { foreignKey: 'userId' });
    }
  }

  UserValidationStatus.init(
    {
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: { tableName: 'users' }, key: 'id' },
        onUpdate: 'CASCADE',
      },
      token: { type: DataTypes.STRING, allowNull: false },
      type: { type: DataTypes.STRING, allowNull: false },
      validatedAt: { allowNull: true, type: DataTypes.DATE },
    },
    // freezeTableName because it wants to pluralize to UserValidationStatuses.
    { sequelize, modelName: 'UserValidationStatus', freezeTableName: true },
  );

  return UserValidationStatus;
};
