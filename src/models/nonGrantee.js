module.exports = (sequelize, DataTypes) => {
  NonGrantee.init({
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
  }, {
    sequelize,
    modelName: 'NonGrantee',
  });
  return NonGrantee;
};
