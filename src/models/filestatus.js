const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FileStatus extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      FileStatus.hasMany(models.File);
    }
  }
  FileStatus.init({
    statusDescription: DataTypes.STRING,
  }, {
    sequelize,
    modelName: 'FileStatus',
  });
  return FileStatus;
};
