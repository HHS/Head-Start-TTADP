const {
  Model,
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class RequestErrors extends Model {
  }
  RequestErrors.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.BIGINT,
    },
    operation: DataTypes.STRING,
    uri: DataTypes.STRING,
    method: DataTypes.STRING,
    requestBody: DataTypes.JSON,
    responseBody: DataTypes.JSON,
    responseCode: DataTypes.STRING,
  }, {
    sequelize,
    modelName: 'RequestErrors',
  });
  return RequestErrors;
};
