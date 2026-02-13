const { Model } = require('sequelize')

/**
 * This function exports a model class for the CollaboratorType table.
 * It defines the table structure and associations with other models.
 * @param {object} sequelize - The Sequelize instance.
 * @param {object} DataTypes - The Sequelize data types.
 * @returns {class} - The CollaboratorType model class.
 */
export default (sequelize, DataTypes) => {
  class CollaboratorType extends Model {
    /**
     * This method defines the associations between CollaboratorType and other models.
     * @param {object} models - The object containing all the defined models.
     */
    static async associate(models) {
      // CollaboratorType belongs to ValidFor
      models.CollaboratorType.belongsTo(models.ValidFor, {
        foreignKey: 'validForId',
        as: 'validFor',
      })

      // ValidFor has many CollaboratorTypes
      models.ValidFor.hasMany(models.CollaboratorType, {
        foreignKey: 'validForId',
        as: 'collaboratorTypes',
      })

      // CollaboratorType belongs to another CollaboratorType as mapsToCollaboratorType
      models.CollaboratorType.belongsTo(models.CollaboratorType, {
        foreignKey: 'mapsTo',
        as: 'mapsToCollaboratorType',
      })

      // CollaboratorType has many CollaboratorTypes as mapsFromCollaboratorTypes
      models.CollaboratorType.hasMany(models.CollaboratorType, {
        foreignKey: 'mapsTo',
        as: 'mapsFromCollaboratorTypes',
      })

      // Add default scope for CollaboratorType including mapsToCollaboratorType association
      models.CollaboratorType.addScope('defaultScope', {
        include: [
          {
            model: models.CollaboratorType.scope(),
            as: 'mapsToCollaboratorType',
            required: false,
          },
        ],
      })
    }
  }

  CollaboratorType.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      validForId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: {
            tableName: 'ValidFor',
          },
          key: 'id',
        },
      },
      propagateOnMerge: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      mapsTo: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: {
            tableName: 'CollaboratorTypes',
          },
          key: 'id',
        },
      },
      latestName: {
        type: DataTypes.VIRTUAL(DataTypes.STRING),
        get() {
          return this.get('mapsTo') ? this.get('mapsToCollaboratorType').get('name') : this.get('name')
        },
      },
      latestId: {
        type: DataTypes.VIRTUAL(DataTypes.INTEGER),
        get() {
          return this.get('mapsTo') ? this.get('mapsToCollaboratorType').get('id') : this.get('id')
        },
      },
    },
    {
      sequelize,
      modelName: 'CollaboratorType',
      paranoid: true,
    }
  )

  return CollaboratorType
}
