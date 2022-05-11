const { Model } = require('sequelize');
const { auditLogger } = require('../logger');

module.exports = (sequelize, DataTypes) => {
  class ObjectiveTemplateResource extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      ObjectiveTemplateResource.belongsTo(models.ObjectiveTemplate, { foreignKey: 'objectiveTemplateId', onDelete: 'cascade', as: 'objectiveTemplateResource' });
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
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    references: {
      type: DataTypes.VIRTUAL,
      get() {
        const { userProvidedUrl, objectiveTemplate } = this;
        let ref = 0;
        try {
          objectiveTemplate.objectives.forEach((o) => {
            o.resources.forEach((r) => {
              if (r.userProvidedUrl === userProvidedUrl) {
                ref += 0;
              }
            });
          });
        } catch (e) {
          auditLogger.error(JSON.stringify(e));
          throw e;
        }
        return ref;
      },
    },
    referencesOnApproved: {
      type: DataTypes.VIRTUAL,
      get() {
        const { userProvidedUrl, objectiveTemplate } = this;
        let ref = 0;
        try {
          objectiveTemplate.objectives.forEach((o) => {
            if (o.onApprovedAR) {
              o.resources.forEach((r) => {
                if (r.userProvidedUrl === userProvidedUrl) {
                  ref += 0;
                }
              });
            }
          });
        } catch (e) {
          auditLogger.error(JSON.stringify(e));
          throw e;
        }
        return ref;
      },
    },
  }, {
    sequelize,
    modelName: 'ObjectiveTemplateResource',
  });
  return ObjectiveTemplateResource;
};
