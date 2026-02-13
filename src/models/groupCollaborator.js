const { Model } = require('sequelize')

// Define and export a function that takes in sequelize and DataTypes as parameters
export default (sequelize, DataTypes) => {
  // Define a class called GroupCollaborator that extends the Model class from sequelize
  class GroupCollaborator extends Model {
    // Define a static method called associate that takes in models as a parameter
    static associate(models) {
      // Associate GroupCollaborator with Group model using belongsTo association
      models.GroupCollaborator.belongsTo(models.Group, {
        foreignKey: 'groupId',
        as: 'group',
      })
      // Associate Group model with GroupCollaborator model using hasMany association
      models.Group.hasMany(models.GroupCollaborator, {
        foreignKey: 'groupId',
        as: 'groupCollaborators',
      })

      // Associate GroupCollaborator with User model using belongsTo association
      models.GroupCollaborator.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      })
      // Associate User model with GroupCollaborator model using hasMany association
      models.User.hasMany(models.GroupCollaborator, {
        foreignKey: 'userId',
        as: 'groupCollaborators',
      })

      // GroupCollaboratorType belongs to CollaboratorType with foreign key collaboratorTypeId
      // and has alias 'type'. On delete cascade is enabled.
      models.GroupCollaborator.belongsTo(models.CollaboratorType, {
        foreignKey: 'collaboratorTypeId',
        sourceKey: 'id',
        onDelete: 'cascade',
        as: 'collaboratorType',
      })

      // CollaboratorType has many GroupCollaboratorType with foreign key collaboratorTypeId
      // and has alias 'groupCollaboratorType'. On delete cascade is enabled.
      models.CollaboratorType.hasMany(models.GroupCollaborator, {
        foreignKey: 'collaboratorTypeId',
        targetKey: 'id',
        onDelete: 'cascade',
        as: 'groupCollaborator',
      })

      // Associate Group model with User model using belongsToMany association through
      // GroupCollaborator model
      models.Group.belongsToMany(models.User, {
        foreignKey: 'groupId',
        otherKey: 'userId',
        through: models.GroupCollaborator,
        as: 'users',
      })
      // Associate User model with Group model using belongsToMany association through
      // GroupCollaborator model
      models.User.belongsToMany(models.Group, {
        foreignKey: 'userId',
        otherKey: 'groupId',
        through: models.GroupCollaborator,
        as: 'groups',
      })

      // Associate CollaboratorType model with User model using belongsToMany association through
      // GroupCollaborator model
      models.CollaboratorType.belongsToMany(models.User, {
        foreignKey: 'collaboratorTypeId',
        otherKey: 'userId',
        through: models.GroupCollaborator,
        as: 'usersThroughGroupCollaborators',
      })

      // Associate User model with CollaboratorType model using belongsToMany association through
      // GroupCollaborator model
      models.User.belongsToMany(models.CollaboratorType, {
        foreignKey: 'userId',
        otherKey: 'collaboratorTypeId',
        through: models.GroupCollaborator,
        as: 'collaboratorTypesThroughGroupCollaborator',
      })

      // Associate Group model with User model using belongsToMany association through
      // GroupCollaborator model
      models.Group.belongsToMany(models.CollaboratorType, {
        foreignKey: 'groupId',
        otherKey: 'collaboratorTypeId',
        through: models.GroupCollaborator,
        as: 'collaboratorTypes',
      })

      // Associate User model with Group model using belongsToMany association through
      // GroupCollaborator model
      models.CollaboratorType.belongsToMany(models.Group, {
        foreignKey: 'collaboratorTypeId',
        otherKey: 'groupId',
        through: models.GroupCollaborator,
        as: 'groups',
      })
    }
  }

  // Initialize the GroupCollaborator model with the provided attributes and options
  GroupCollaborator.init(
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: null,
        comment: null,
        primaryKey: true,
        autoIncrement: true,
      },
      groupId: {
        allowNull: false,
        type: DataTypes.INTEGER,
        references: {
          model: {
            tableName: 'Groups',
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
      modelName: 'GroupCollaborator',
      paranoid: true,
      indexes: [
        {
          unique: true,
          fields: ['userId', 'groupId', 'collaboratorTypeId'],
        },
      ],
    }
  )

  // Return the GroupCollaborator model
  return GroupCollaborator
}
