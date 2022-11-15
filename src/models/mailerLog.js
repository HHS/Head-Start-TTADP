const {
  Model,
} = require('sequelize');
const { EMAIL_ACTIONS } = require('../constants');

module.exports = (sequelize, DataTypes) => {
  class MailerLogs extends Model {
  }
  MailerLogs.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.BIGINT,
    },
    jobId: {
      allowNull: false,
      type: DataTypes.STRING,
    },
    emailTo: {
      allowNull: false,
      type: DataTypes.ARRAY(DataTypes.STRING),
    },
    action: {
      allowNull: false,
      type: DataTypes.ENUM(Object.keys(EMAIL_ACTIONS).map((k) => EMAIL_ACTIONS[k])),
    },
    subject: {
      allowNull: false,
      type: DataTypes.STRING,
    },
    activityReports: {
      allowNull: false,
      type: DataTypes.ARRAY(DataTypes.INTEGER),
    },
    success: {
      allowNull: true,
      type: DataTypes.BOOLEAN,
    },
    result: {
      allowNull: true,
      type: DataTypes.JSON,
    },
  }, {
    sequelize,
    modelName: 'MailerLogs',
  });
  return MailerLogs;
};
