/**
 * This function exports a model class for the GoalCollaboratorRole table.
 * It defines the associations between the GoalCollaboratorRole, GoalCollaborator, and Role tables.
 * The GoalCollaboratorRole table represents the roles assigned to goal collaborators.
 *
 * @param {object} sequelize - The Sequelize instance
 * @param {object} DataTypes - The Sequelize data types
 * @returns {class} - The GoalCollaboratorRole model class
 */
export default (sequelize, DataTypes) => {
  // Define the GoalCollaboratorRole model class
  class GoalCollaboratorRole extends Model {
    /**
     * This static method defines the associations between the GoalCollaboratorRole, GoalCollaborator, and Role models.
     *
     * @param {object} models - The Sequelize models object
     */
    static associate(models) {
      // Define the association between GoalCollaboratorRole and GoalCollaborator (one-to-many)
      models.GoalCollaboratorRole.belongsTo(
        models.GoalCollaborator,
        {
          foreignKey: 'goalCollaboratorId',
          as: 'goalCollaborator',
        },
      );
      models.GoalCollaborator.hasMany(
        models.GoalCollaboratorRole,
        {
          foreignKey: 'goalCollaboratorId',
          as: 'goalCollaboratorRole',
        },
      );

      // Define the association between GoalCollaboratorRole and Role (one-to-many)
      models.GoalCollaboratorRole.belongsTo(
        models.Role,
        {
          foreignKey: 'roleId',
          onDelete: 'cascade',
          as: 'role',
        },
      );
      models.Role.hasMany(
        models.GoalCollaboratorRole,
        {
          foreignKey: 'roleId',
          onDelete: 'cascade',
          as: 'goalCollaboratorRole',
        },
      );

      // Define the many-to-many association between Role and GoalCollaborator through GoalCollaboratorRole
      models.Role.belongsToMany(
        models.GoalCollaborator,
        {
          foreignKey: 'roleId',
          otherKey: 'goalCollaboratorId',
          through: models.GoalCollaboratorRole,
          as: 'goalCollaborators',
        },
      );

      // Define the many-to-many association between GoalCollaborator and Role through GoalCollaboratorRole
      models.GoalCollaborator.belongsToMany(
        models.Role,
        {
          foreignKey: 'goalCollaboratorId',
          otherKey: 'roleId',
          through: models.GoalCollaboratorRole,
          as: 'roles',
        },
      );
    }
  }

  // Initialize the GoalCollaboratorRole model with its attributes and options
  GoalCollaboratorRole.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: true,
      autoIncrement: true,
    },
    goalCollaboratorId: {
      allowNull: false,
      type: DataTypes.INTEGER,
      references: {
        model: {
          tableName: 'GoalCollaborators',
        },
        key: 'id',
      },
    },
    roleId: {
      allowNull: false,
      type: DataTypes.INTEGER,
      references: {
        model: {
          tableName: 'Roles',
        },
        key: 'id',
      },
    },
  }, {
    sequelize,
    modelName: 'GoalCollaboratorRole',
    paranoid: true,
  });

  // Return the GoalCollaboratorRole model class
  return GoalCollaboratorRole;
};