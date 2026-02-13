const { Model } = require('sequelize')

// Define and export a function that takes in sequelize and DataTypes as parameters
export default (sequelize, DataTypes) => {
  // Define a class called ObjectiveCollaborator that extends the Model class from sequelize
  class ObjectiveCollaborator extends Model {
    // Define a static method called associate that takes in models as a parameter
    static associate(models) {
      // Associate ObjectiveCollaborator with Objective model using belongsTo association
      models.ObjectiveCollaborator.belongsTo(models.Objective, {
        foreignKey: 'objectiveId',
        as: 'objective',
      })
      // Associate Objective model with ObjectiveCollaborator model using hasMany association
      models.Objective.hasMany(models.ObjectiveCollaborator, {
        foreignKey: 'objectiveId',
        as: 'objectiveCollaborators',
      })

      // Associate ObjectiveCollaborator with User model using belongsTo association
      models.ObjectiveCollaborator.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      })
      // Associate User model with ObjectiveCollaborator model using hasMany association
      models.User.hasMany(models.ObjectiveCollaborator, {
        foreignKey: 'userId',
        as: 'objectiveCollaborators',
      })

      // ObjectiveCollaboratorType belongs to CollaboratorType with foreign key collaboratorTypeId
      // and has alias 'type'. On delete cascade is enabled.
      models.ObjectiveCollaborator.belongsTo(models.CollaboratorType, {
        foreignKey: 'collaboratorTypeId',
        sourceKey: 'id',
        onDelete: 'cascade',
        as: 'collaboratorType',
      })

      // CollaboratorType has many ObjectiveCollaboratorType with foreign key collaboratorTypeId
      // and has alias 'objectiveCollaboratorType'. On delete cascade is enabled.
      models.CollaboratorType.hasMany(models.ObjectiveCollaborator, {
        foreignKey: 'collaboratorTypeId',
        targetKey: 'id',
        onDelete: 'cascade',
        as: 'objectiveCollaborator',
      })

      // Associate Objective model with User model using belongsToMany association through
      // ObjectiveCollaborator model
      models.Objective.belongsToMany(models.User, {
        foreignKey: 'objectiveId',
        otherKey: 'userId',
        through: models.ObjectiveCollaborator,
        as: 'users',
      })
      // Associate User model with Objective model using belongsToMany association through
      // ObjectiveCollaborator model
      models.User.belongsToMany(models.Objective, {
        foreignKey: 'userId',
        otherKey: 'objectiveId',
        through: models.ObjectiveCollaborator,
        as: 'objectives',
      })

      // Associate CollaboratorType model with User model using belongsToMany association through
      // ObjectiveCollaborator model
      models.CollaboratorType.belongsToMany(models.User, {
        foreignKey: 'collaboratorTypeId',
        otherKey: 'userId',
        through: models.ObjectiveCollaborator,
        as: 'usersThroughObjectiveCollaborators',
      })

      // Associate User model with CollaboratorType model using belongsToMany association through
      // ObjectiveCollaborator model
      models.User.belongsToMany(models.CollaboratorType, {
        foreignKey: 'userId',
        otherKey: 'collaboratorTypeId',
        through: models.ObjectiveCollaborator,
        as: 'collaboratorTypesThroughObjectiveCollaborator',
      })

      // Associate Objective model with User model using belongsToMany association through
      // ObjectiveCollaborator model
      models.Objective.belongsToMany(models.CollaboratorType, {
        foreignKey: 'objectiveId',
        otherKey: 'collaboratorTypeId',
        through: models.ObjectiveCollaborator,
        as: 'collaboratorTypes',
      })

      // Associate User model with Objective model using belongsToMany association through
      // ObjectiveCollaborator model
      models.CollaboratorType.belongsToMany(models.Objective, {
        foreignKey: 'collaboratorTypeId',
        otherKey: 'objectiveId',
        through: models.ObjectiveCollaborator,
        as: 'objectives',
      })
    }
  }

  // Initialize the ObjectiveCollaborator model with the provided attributes and options
  ObjectiveCollaborator.init(
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: null,
        comment: null,
        primaryKey: true,
        autoIncrement: true,
      },
      objectiveId: {
        allowNull: false,
        type: DataTypes.INTEGER,
        references: {
          model: {
            tableName: 'Objectives',
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
      modelName: 'ObjectiveCollaborator',
      paranoid: true,
      indexes: [
        {
          unique: true,
          fields: ['userId', 'objectiveId', 'collaboratorTypeId'],
        },
      ],
    }
  )

  // Return the ObjectiveCollaborator model
  return ObjectiveCollaborator
}
