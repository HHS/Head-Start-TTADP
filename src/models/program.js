const {
  Model,
} = require('sequelize');

export default (sequelize, DataTypes) => {
  class Program extends Model {
    static associate(models) {
      Program.belongsTo(models.Grant, { foreignKey: 'grantId', as: 'grant', hooks: true });
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
    startDate: DataTypes.STRING,
    endDate: DataTypes.STRING,
    status: DataTypes.STRING,
    name: DataTypes.STRING,
  }, {
    sequelize,
    modelName: 'Program',
  });
  return Program;
};
