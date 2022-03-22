const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ObjectiveResource extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      ObjectiveResource.belongsTo(models.Objective, { foreignKey: 'objectiveId' });
    }
  }
  ObjectiveResource.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    userProvidedUrl: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    objectiveId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'ObjectiveResource',
  });
  return ObjectiveResource;
};
