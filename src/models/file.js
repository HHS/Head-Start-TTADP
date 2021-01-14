const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class File extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      File.belongsTo(models.ActivityReports);
    }
  }
  File.init({
    originalFileName: DataTypes.STRING,
    key: DataTypes.STRING,
  }, {
    sequelize,
    modelName: 'File',
  });
  return File;
};
