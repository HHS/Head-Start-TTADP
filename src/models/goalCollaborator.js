const { Model } = require('sequelize');
const { afterCreate, afterUpdate, beforeDestroy } = require('./hooks/goalCollaborator');

// Define and export a function that takes in sequelize and DataTypes as parameters
export default (sequelize, DataTypes) => {
  // Define a class called GoalCollaborator that extends the Model class from sequelize
  class GoalCollaborator extends Model {
    // Define a static method called associate that takes in models as a parameter
    static associate(models) {
      // Associate GoalCollaborator with Goal model using belongsTo association
      models.GoalCollaborator.belongsTo(
        models.Goal,
        {
          foreignKey: 'goalId',
          as: 'goal',
        },
      );
      // Associate Goal model with GoalCollaborator model using hasMany association
      models.Goal.hasMany(
        models.GoalCollaborator,
        {
          foreignKey: 'goalId',
          as: 'goalCollaborators',
        },
      );

      // Associate GoalCollaborator with User model using belongsTo association
      models.GoalCollaborator.belongsTo(
        models.User,
        {
          foreignKey: 'userId',
          as: 'user',
        },
      );
      // Associate User model with GoalCollaborator model using hasMany association
      models.User.hasMany(
        models.GoalCollaborator,
        {
          foreignKey: 'userId',
          as: 'goalCollaborators',
        },
      );

      // Associate Goal model with User model using belongsToMany association through GoalCollaborator model
      models.Goal.belongsToMany(
        models.User,
        {
          foreignKey: 'goalId',
          otherKey: 'userId',
          through: models.GoalCollaborator,
          as: 'users',
        },
      );
      // Associate User model with Goal model using belongsToMany association through GoalCollaborator model
      models.User.belongsToMany(
        models.Goal,
        {
          foreignKey: 'userId',
          otherKey: 'goalId',
          through: models.GoalCollaborator,
          as: 'goals',
        },
      );
    }
  }

  // Initialize the GoalCollaborator model with the provided attributes and options
  GoalCollaborator.init({
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
  }, {
    sequelize,
    modelName: 'GoalCollaborator',
    paranoid: true,
    hooks: {
      // Define hook functions to be executed after creating, updating, and destroying instances of GoalCollaborator
      afterCreate: async (instance, options) => afterCreate(sequelize, instance, options),
      afterUpdate: async (instance, options) => afterUpdate(sequelize, instance, options),
      beforeDestroy: async (instance, options) => beforeDestroy(sequelize, instance, options),
    },
    indexes: [
      {
        unique: true,
        fields: ['userId', 'goalId'],
      },
    ],
  });

  // Return the GoalCollaborator model
  return GoalCollaborator;
};