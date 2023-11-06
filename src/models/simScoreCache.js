const {
  Model,
} = require('sequelize');

/**
   * RolesTopic table. Junction table between Roles and Topics to support many to many relationship.
   *
   * @param {} sequelize
   * @param {*} DataTypes
   */
export default (sequelize, DataTypes) => {
  class SimScoreCache extends Model {
    static associate(models) {
      SimScoreCache.hasMany(models.Goal, { foreignKey: 'id', as: 'goalOne' });
      SimScoreCache.hasMany(models.Goal, { foreignKey: 'id', as: 'goalTwo' });
      SimScoreCache.hasMany(models.Recipient, { foreignKey: 'id', as: 'recipient' });
    }
  }
  SimScoreCache.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    recipient_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    goal1: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    goal2: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    score: {
      type: DataTypes.DECIMAL(3, 1),
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'SimScoreCache',
  });
  return SimScoreCache;
};
