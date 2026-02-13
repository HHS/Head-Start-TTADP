const { Model } = require('sequelize')

/**
 * RolesTopic table. Junction table between Roles and Topics to support many to many relationship.
 *
 * @param {} sequelize
 * @param {*} DataTypes
 */
export default (sequelize, DataTypes) => {
  class RoleTopic extends Model {
    static associate(models) {
      RoleTopic.belongsTo(models.Role, { foreignKey: 'roleId', onDelete: 'cascade', as: 'role' })
      RoleTopic.belongsTo(models.Topic, { foreignKey: 'topicId', onDelete: 'cascade', as: 'topic' })
    }
  }
  RoleTopic.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      roleId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      topicId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'RoleTopic',
    }
  )
  return RoleTopic
}
