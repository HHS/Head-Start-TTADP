const {
  Model,
} = require('sequelize');
const { formatDate } = require('../lib/modelHelpers');

export default (sequelize, DataTypes) => {
  class Program extends Model {
    static associate(models) {
      Program.belongsTo(models.Grant, { foreignKey: 'grantId', as: 'grant' });
      Program.hasMany(models.ProgramPersonnel, { foreignKey: 'programId', as: 'programPersonnel' });
    }
  }
  Program.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      primaryKey: true,
      autoIncrement: false,
    },
    grantId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    programType: DataTypes.STRING,
    startYear: DataTypes.STRING,
    startDate: {
      type: DataTypes.DATEONLY,
      get: formatDate,
    },
    endDate: {
      type: DataTypes.DATEONLY,
      get: formatDate,
    },
    status: DataTypes.STRING,
    name: DataTypes.STRING,
  }, {
    sequelize,
    modelName: 'Program',
  });
  return Program;
};
