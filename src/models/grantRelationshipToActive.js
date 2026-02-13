const { Model } = require('sequelize')

export default (sequelize, DataTypes) => {
  class GrantRelationshipToActive extends Model {
    static associate(models) {
      GrantRelationshipToActive.belongsTo(models.Grant, { foreignKey: 'grantId', as: 'grant' })
      GrantRelationshipToActive.belongsTo(models.Grant, {
        foreignKey: 'activeGrantId',
        as: 'activeGrant',
      })

      models.Grant.hasMany(GrantRelationshipToActive, {
        foreignKey: 'grantId',
        as: 'grantRelationships',
      })
      models.Grant.hasMany(GrantRelationshipToActive, {
        foreignKey: 'activeGrantId',
        as: 'activeGrantRelationships',
      })
    }

    // Static method to refresh the materialized view
    static async refresh() {
      const suppressSuccessMessage = process.env.SUPPRESS_SUCCESS_MESSAGE === 'true'
      try {
        await sequelize.query('REFRESH MATERIALIZED VIEW "GrantRelationshipToActive";')
        if (!suppressSuccessMessage) {
          // eslint-disable-next-line no-console
          console.log('Materialized view refreshed successfully')
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error refreshing materialized view:', error)
        throw error
      }
    }
  }

  GrantRelationshipToActive.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      grantId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      activeGrantId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      sequelize,
      timestamps: false, // Disable timestamps since this is a materialized view
      freezeTableName: true, // Ensures Sequelize uses the exact table name provided
      modelName: 'GrantRelationshipToActive',
    }
  )

  // Override to prevent modifications
  GrantRelationshipToActive.beforeCreate(() => {
    throw new Error('Insertion not allowed on materialized view')
  })

  GrantRelationshipToActive.beforeUpdate(() => {
    throw new Error('Update not allowed on materialized view')
  })

  GrantRelationshipToActive.beforeDestroy(() => {
    throw new Error('Deletion not allowed on materialized view')
  })

  return GrantRelationshipToActive
}
