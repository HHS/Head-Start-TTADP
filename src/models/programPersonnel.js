const { Model, Op } = require('sequelize')
const { afterBulkCreate } = require('./hooks/programPersonnel')

export default (sequelize, DataTypes) => {
  class ProgramPersonnel extends Model {
    static associate(models) {
      ProgramPersonnel.belongsTo(models.Program, { foreignKey: 'programId', as: 'program' })
      ProgramPersonnel.belongsTo(models.Grant, { foreignKey: 'grantId', as: 'grant' })
      ProgramPersonnel.hasMany(models.ProgramPersonnel, {
        foreignKey: 'mapsTo',
        as: 'mapsFromProgramPersonnel',
      })
      ProgramPersonnel.belongsTo(models.ProgramPersonnel, {
        foreignKey: 'mapsTo',
        as: 'mapsToProgramPersonnel',
      })
    }
  }
  ProgramPersonnel.init(
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      grantId: {
        allowNull: false,
        type: DataTypes.INTEGER,
      },
      programId: {
        allowNull: false,
        type: DataTypes.INTEGER,
      },
      role: {
        allowNull: false,
        type: DataTypes.STRING,
      },
      prefix: {
        allowNull: true,
        type: DataTypes.STRING,
      },
      firstName: {
        allowNull: true,
        type: DataTypes.STRING,
      },
      lastName: {
        allowNull: true,
        type: DataTypes.STRING,
      },
      suffix: {
        allowNull: true,
        type: DataTypes.STRING,
      },
      title: {
        allowNull: true,
        type: DataTypes.STRING,
      },
      email: {
        allowNull: true,
        type: DataTypes.STRING,
      },
      effectiveDate: {
        allowNull: true,
        type: DataTypes.DATE,
      },
      active: {
        allowNull: false,
        type: DataTypes.BOOLEAN,
      },
      mapsTo: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
        references: {
          model: {
            tableName: 'ProgramPersonnel',
          },
          key: 'id',
        },
      },
      fullName: {
        type: DataTypes.VIRTUAL,
        get() {
          return `${this.firstName || ''} ${this.lastName || ''}`
        },
      },
      fullRole: {
        type: DataTypes.VIRTUAL,
        get() {
          const { role, program } = this
          if (!role || !program) return role

          const { programType } = program

          if (role.toLowerCase() === 'cfo') {
            if (programType && programType.toLowerCase() === 'ehs') {
              return 'Chief Financial Officer for Early Head Start'
            }

            if (programType && programType.toLowerCase() === 'hs') {
              return 'Chief Financial Officer for Head Start'
            }

            return 'Chief Financial Officer'
          }

          if (role.toLowerCase() === 'director') {
            if (programType && programType.toLowerCase() === 'ehs') {
              return 'Director for Early Head Start'
            }

            if (programType && programType.toLowerCase() === 'hs') {
              return 'Director for Head Start'
            }

            return 'Director'
          }

          return role
        },
      },
      nameAndRole: {
        type: DataTypes.VIRTUAL,
        get() {
          return `${this.fullName} - ${this.fullRole}`
        },
      },
    },
    {
      sequelize,
      modelName: 'ProgramPersonnel',
      tableName: 'ProgramPersonnel',
      freezeTableName: true,
      hooks: {
        afterBulkCreate: async (instances, options) => afterBulkCreate(sequelize, instances, options),
      },
    }
  )
  return ProgramPersonnel
}
