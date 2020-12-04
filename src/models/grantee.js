module.exports = (sequelize, DataTypes) => {
  Grantee.init({
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
  }, {
    sequelize,
    modelName: 'Grantee',
  });
  return Grantee;
};
