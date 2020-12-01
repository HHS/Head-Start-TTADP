const {
  Model,
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Ttaplan extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Ttaplan.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    // granteeId: {
    //   type: Sequelize.INTEGER,
    //   allowNull: false,
    //   references: {
    //     model: {
    //       tableName: 'Grantees',
    //     },
    //     key: 'id',
    //   },
    // },
    grant: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    // goalId: {
    //   type: Sequelize.INTEGER,
    //   allowNull: false,
    //   references: {
    //     model: {
    //       tableName: 'Goals',
    //     },
    //     key: 'id',
    //   },
    // },
  }, {
    sequelize,
    modelName: 'Ttaplan',
  });
  return Ttaplan;
};
