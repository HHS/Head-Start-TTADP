const {
  Model,
} = require('sequelize');

/**
 * RolesTopic table. Junction table between Roles and Topics to support many to many relationship.
 *
 * @param {} sequelize
 * @param {*} DataTypes
 */
module.exports = (sequelize, DataTypes) => {
  class RoleTopic extends Model {
    static associate() {
    }
  }
  RoleTopic.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
  }, {
    sequelize,
    modelName: 'RoleTopic',
  });
  return RoleTopic;
};
