const { Model } = require('sequelize');

/**
 * Outbox row for deleting a file's S3 object. Written in the same transaction that deletes
 * the File (see removeOrphanedFiles in services/files), marked complete by the S3 delete job,
 * and re-enqueued by a cron job while it stays pending.
 */
export default (sequelize, DataTypes) => {
  class FileDeletion extends Model {}
  FileDeletion.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      fileId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      key: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      attempts: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      completedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'FileDeletion',
      tableName: 'FileDeletions',
    }
  );
  return FileDeletion;
};
