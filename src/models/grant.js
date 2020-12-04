module.exports = (sequelize, DataTypes) => {
  class Grant extends Model {
    static associate(models) {
      Grant.belongsTo(models.Grantee, { foreignKey: 'granteeId'});
      Grant.belongsTo(models.Region, { foreignKey: 'regionId'});
    }
  }
  Grant.init({
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    number: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
  }, {
    sequelize,
    modelName: 'Grant',
  });
  return Grant;
};
