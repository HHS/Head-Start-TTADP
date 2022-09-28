const {
  Model,
} = require('sequelize');

/**
 * OtherEntity table
 *
 * @param {} sequelize
 * @param {*} DataTypes
 */
module.exports = (sequelize, DataTypes) => {
  class OtherEntity extends Model {
    static associate(models) {
      OtherEntity.belongsTo(models.ActivityRecipient, { foreignKey: 'id', as: 'activityRecipients', hooks: true });
      OtherEntity.belongsToMany(models.ActivityReport, {
        through: models.ActivityRecipient,
        foreignKey: 'otherEntityId',
        otherKey: 'activityReportId',
        as: 'activityReports',
        hooks: true,
      });
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
