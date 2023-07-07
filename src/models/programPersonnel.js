const {
  Model, Op,
} = require('sequelize');

export default (sequelize, DataTypes) => {
  class ProgramPersonnel extends Model {
    static associate(models) {
      ProgramPersonnel.belongsTo(models.Program, { foreignKey: 'programId', as: 'program' });
      ProgramPersonnel.belongsTo(models.Grant, { foreignKey: 'grantId', as: 'grant' });
    }
  }
  ProgramPersonnel.init({
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
    originalPersonnelId: {
      allowNull: true,
      type: DataTypes.INTEGER,
    },
  }, {
    sequelize,
    modelName: 'ProgramPersonnel',
    tableName: 'ProgramPersonnel',
    freezeTableName: true,
  });
  return ProgramPersonnel;
};
