const {
  Model, Op,
} = require('sequelize');

export default (sequelize, DataTypes) => {
  class GrantPersonnel extends Model {
    static associate(models) {
      GrantPersonnel.belongsTo(models.Grant, { foreignKey: 'grantId', as: 'grant' });
    }
  }
  GrantPersonnel.init({
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
    modelName: 'GrantPersonnel',
    freezeTableName: true,
  });
  return GrantPersonnel;
};
