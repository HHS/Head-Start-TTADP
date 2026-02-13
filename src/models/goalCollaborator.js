const { Model } = require('sequelize')

// Define and export a function that takes in sequelize and DataTypes as parameters
export default (sequelize, DataTypes) => {
  // Define a class called GoalCollaborator that extends the Model class from sequelize
  class GoalCollaborator extends Model {
    // Define a static method called associate that takes in models as a parameter
    static associate(models) {
      // Associate GoalCollaborator with Goal model using belongsTo association
      models.GoalCollaborator.belongsTo(models.Goal, {
        foreignKey: 'goalId',
        as: 'goal',
      })
      // Associate Goal model with GoalCollaborator model using hasMany association
      models.Goal.hasMany(models.GoalCollaborator, {
        foreignKey: 'goalId',
        as: 'goalCollaborators',
      })

      // Associate GoalCollaborator with User model using belongsTo association
      models.GoalCollaborator.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      })
      // Associate User model with GoalCollaborator model using hasMany association
      models.User.hasMany(models.GoalCollaborator, {
        foreignKey: 'userId',
        as: 'goalCollaborators',
      })

      // GoalCollaboratorType belongs to CollaboratorType with foreign key collaboratorTypeId
      // and has alias 'type'. On delete cascade is enabled.
      models.GoalCollaborator.belongsTo(models.CollaboratorType, {
        foreignKey: 'collaboratorTypeId',
        sourceKey: 'id',
        onDelete: 'cascade',
        as: 'collaboratorType',
      })

      // CollaboratorType has many GoalCollaboratorType with foreign key collaboratorTypeId
      // and has alias 'goalCollaboratorType'. On delete cascade is enabled.
      models.CollaboratorType.hasMany(models.GoalCollaborator, {
        foreignKey: 'collaboratorTypeId',
        targetKey: 'id',
        onDelete: 'cascade',
        as: 'goalCollaborator',
      })

      // Associate Goal model with User model using belongsToMany association through
      // GoalCollaborator model
      models.Goal.belongsToMany(models.User, {
        foreignKey: 'goalId',
        otherKey: 'userId',
        through: models.GoalCollaborator,
        as: 'users',
      })
      // Associate User model with Goal model using belongsToMany association through
      // GoalCollaborator model
      models.User.belongsToMany(models.Goal, {
        foreignKey: 'userId',
        otherKey: 'goalId',
        through: models.GoalCollaborator,
        as: 'goals',
      })

      // Associate CollaboratorType model with User model using belongsToMany association through
      // GoalCollaborator model
      models.CollaboratorType.belongsToMany(models.User, {
        foreignKey: 'collaboratorTypeId',
        otherKey: 'userId',
        through: models.GoalCollaborator,
        as: 'usersThroughGoalCollaborators',
      })

      // Associate User model with CollaboratorType model using belongsToMany association through
      // GoalCollaborator model
      models.User.belongsToMany(models.CollaboratorType, {
        foreignKey: 'userId',
        otherKey: 'collaboratorTypeId',
        through: models.GoalCollaborator,
        as: 'collaboratorTypesThroughGoalCollaborator',
      })

      // Associate Goal model with User model using belongsToMany association through
      // GoalCollaborator model
      models.Goal.belongsToMany(models.CollaboratorType, {
        foreignKey: 'goalId',
        otherKey: 'collaboratorTypeId',
        through: models.GoalCollaborator,
        as: 'collaboratorTypes',
      })

      // Associate User model with Goal model using belongsToMany association through
      // GoalCollaborator model
      models.CollaboratorType.belongsToMany(models.Goal, {
        foreignKey: 'collaboratorTypeId',
        otherKey: 'goalId',
        through: models.GoalCollaborator,
        as: 'goals',
      })
    }
  }

  // Initialize the GoalCollaborator model with the provided attributes and options
  GoalCollaborator.init(
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: null,
        comment: null,
        primaryKey: true,
        autoIncrement: true,
      },
      goalId: {
        allowNull: false,
        type: DataTypes.INTEGER,
        references: {
          model: {
            tableName: 'Goals',
          },
          key: 'id',
        },
      },
      userId: {
        allowNull: false,
        type: DataTypes.INTEGER,
        references: {
          model: {
            tableName: 'Users',
          },
          key: 'id',
        },
      },
      collaboratorTypeId: {
        allowNull: false,
        type: DataTypes.INTEGER,
        references: {
          model: {
            tableName: 'CollaboratorTypes',
          },
          key: 'id',
        },
      },
      linkBack: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'GoalCollaborator',
      paranoid: true,
      indexes: [
        {
          unique: true,
          fields: ['userId', 'goalId', 'collaboratorTypeId'],
        },
      ],
    }
  )

  // Return the GoalCollaborator model
  return GoalCollaborator
}
