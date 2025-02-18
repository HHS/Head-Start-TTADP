const {
  Model,
} = require('sequelize');

/**
 * OtherEntity table
 *
 * @param {} sequelize
 * @param {*} DataTypes
 */
export default (sequelize, DataTypes) => {
  class OtherEntity extends Model {
    static associate(models) {
      OtherEntity.hasMany(models.ActivityRecipient, { foreignKey: 'id', as: 'activityRecipients' });
      OtherEntity.belongsToMany(models.ActivityReport, {
        through: models.ActivityRecipient,
        foreignKey: 'otherEntityId',
        otherKey: 'activityReportId',
        as: 'activityReports',
      });
      OtherEntity.hasMany(models.Objective, { foreignKey: 'otherEntityId', as: 'objectives' });
    }
  }
  OtherEntity.init({
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
  }, {
    sequelize,
    modelName: 'OtherEntity',
  });
  return OtherEntity;
};
