const { Model } = require('sequelize');
const { auditLogger } = require('../logger');

/**
   * ObjectiveRole table. Junction table
   * between Objectives and roles
   * @param {} sequelize
   * @param {*} DataTypes
   */
module.exports = (sequelize, DataTypes) => {
  class ObjectiveTemplateRole extends Model {
    static associate(models) {
      ObjectiveTemplateRole.belongsTo(models.ObjectiveTemplate, { foreignKey: 'objectiveTemplateId', onDelete: 'cascade', as: 'objectiveTemplate' });
      ObjectiveTemplateRole.belongsTo(models.Role, { foreignKey: 'roleId', onDelete: 'cascade', as: 'role' });
    }
  }
  ObjectiveTemplateRole.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    objectiveTemplateId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    roleId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    references: {
      type: DataTypes.VIRTUAL,
      get() {
        const { roleId, objectiveTemplate } = this;
        let ref = 0;
        try {
          objectiveTemplate.objectives.forEach((o) => {
            o.roles.forEach((r) => {
              if (r.roleId === roleId) {
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
        const { roleId, objectiveTemplate } = this;
        let ref = 0;
        try {
          objectiveTemplate.objectives.forEach((o) => {
            if (o.onApprovedAR) {
              o.roles.forEach((r) => {
                if (r.roleId === roleId) {
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
    modelName: 'ObjectiveTemplateRole',
  });
  return ObjectiveTemplateRole;
};
