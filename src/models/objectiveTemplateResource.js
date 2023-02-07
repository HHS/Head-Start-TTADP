const { Model } = require('sequelize');
const { SOURCE_FIELD } = require('../constants');
// const { auditLogger } = require('../logger');
const { calculateIsAutoDetectedForObjectiveTemplate } = require('../services/resource');

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
    resourceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    objectiveTemplateId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    sourceFields: {
      allowNull: true,
      default: null,
      type: DataTypes.ARRAY((DataTypes.ENUM(Object.values(SOURCE_FIELD.OBJECTIVETEMPLATE)))),
    },
    isAutoDetected: {
      type: new DataTypes.VIRTUAL(DataTypes.BOOLEAN, ['sourceFields']),
      get() {
        return calculateIsAutoDetectedForObjectiveTemplate(this.get('sourceFields'));
      },
    },
  }, {
    sequelize,
    modelName: 'ObjectiveTemplateResource',
  });
  return ObjectiveTemplateResource;
};
