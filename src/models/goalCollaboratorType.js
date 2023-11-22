/**
 * This function exports a model class for GoalCollaboratorType.
 * @param {object} sequelize - The Sequelize instance.
 * @param {object} DataTypes - The Sequelize DataTypes object.
 * @returns {class} - The GoalCollaboratorType model class.
 */
export default (sequelize, DataTypes) => {
  class GoalCollaboratorType extends Model {
    /**
     * This static method defines the associations for GoalCollaboratorType.
     * @param {object} models - The Sequelize models object.
     */
    static associate(models) {
      // GoalCollaboratorType belongs to GoalCollaborator with foreign key goalCollaboratorId
      // and has alias 'goalCollaborator'
      models.GoalCollaboratorType.belongsTo(
        models.GoalCollaborator,
        {
          foreignKey: 'goalCollaboratorId',
          sourceKey: 'id',
          as: 'goalCollaborator',
        },
      );
      
      // GoalCollaborator has many GoalCollaboratorType with foreign key goalCollaboratorId
      // and has alias 'goalCollaboratorType'
      models.GoalCollaborator.hasMany(
        models.GoalCollaboratorType,
        {
          foreignKey: 'goalCollaboratorId',
          targetKey: 'id',
          as: 'goalCollaboratorType',
        },
      );

      // GoalCollaboratorType belongs to CollaboratorType with foreign key collaboratorTypeId
      // and has alias 'type'. On delete cascade is enabled.
      models.GoalCollaboratorType.belongsTo(
        models.CollaboratorType,
        {
          foreignKey: 'collaboratorTypeId',
          sourceKey: 'id',
          onDelete: 'cascade',
          as: 'type',
        },
      );
      
      // CollaboratorType has many GoalCollaboratorType with foreign key collaboratorTypeId
      // and has alias 'goalCollaboratorType'. On delete cascade is enabled.
      models.CollaboratorType.hasMany(
        models.GoalCollaboratorType,
        {
          foreignKey: 'collaboratorTypeId',
          targetKey: 'id',
          onDelete: 'cascade',
          as: 'goalCollaboratorType',
        },
      );

      // CollaboratorType belongs to many GoalCollaborator through GoalCollaboratorType
      // with foreign key collaboratorTypeId and other key goalCollaboratorId.
      // The association has alias 'goalCollaborators'.
      models.CollaboratorType.belongsToMany(
        models.GoalCollaborator,
        {
          foreignKey: 'collaboratorTypeId',
          otherKey: 'goalCollaboratorId',
          through: models.GoalCollaboratorType,
          as: 'goalCollaborators',
        },
      );

      // GoalCollaborator belongs to many CollaboratorType through GoalCollaboratorType
      // with foreign key goalCollaboratorId and other key collaboratorTypeId.
      // The association has alias 'types'.
      models.GoalCollaborator.belongsToMany(
        models.CollaboratorType,
        {
          foreignKey: 'goalCollaboratorId',
          otherKey: 'collaboratorTypeId',
          through: models.GoalCollaboratorType,
          as: 'types',
        },
      );
    }
  }

  // Initialize the GoalCollaboratorType model with its attributes and options.
  GoalCollaboratorType.init({
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
  }, {
    sequelize,
    modelName: 'GoalCollaboratorType',
    paranoid: true,
  });

  // Return the GoalCollaboratorType model class.
  return GoalCollaboratorType;
};