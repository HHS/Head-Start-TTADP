const { Model } = require('sequelize');
// const { auditLogger } = require('../logger');

export default (sequelize, DataTypes) => {
  class ObjectiveTemplateResource extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      ObjectiveTemplateResource.belongsTo(models.ObjectiveTemplate, { foreignKey: 'objectiveTemplateId', onDelete: 'cascade', as: 'objectiveTemplate' });
    }
  }
  ObjectiveTemplateResource.init({
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
    objectiveTemplateId: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'ObjectiveTemplateResource',
  });
  return ObjectiveTemplateResource;
};
