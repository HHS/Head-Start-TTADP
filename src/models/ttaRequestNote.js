const { Model } = require('sequelize');
const { TTA_REQUEST_NOTE_ACTIONS, TTA_REQUEST_STEPS } = require('@ttahub/common');

/**
 * One entry in a TTA request's history: what was done at which step, by whom, and the note
 * they left with it. Entries are only ever added, so the history reads in the order it happened.
 */
export default (sequelize, DataTypes) => {
  class TtaRequestNote extends Model {
    static associate(models) {
      TtaRequestNote.belongsTo(models.TtaRequest, {
        foreignKey: 'ttaRequestId',
        onDelete: 'cascade',
        as: 'ttaRequest',
      });
      TtaRequestNote.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
    }
  }

  TtaRequestNote.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      ttaRequestId: {
        allowNull: false,
        type: DataTypes.INTEGER,
        references: {
          model: 'TtaRequests',
          key: 'id',
        },
      },
      userId: {
        allowNull: false,
        type: DataTypes.INTEGER,
        references: {
          model: 'Users',
          key: 'id',
        },
      },
      step: {
        allowNull: false,
        type: DataTypes.ENUM(Object.values(TTA_REQUEST_STEPS)),
      },
      action: {
        allowNull: false,
        type: DataTypes.ENUM(Object.values(TTA_REQUEST_NOTE_ACTIONS)),
      },
      note: {
        allowNull: true,
        type: DataTypes.TEXT,
      },
    },
    {
      sequelize,
      modelName: 'TtaRequestNote',
      tableName: 'TtaRequestNotes',
      timestamps: true,
      indexes: [
        {
          name: 'tta_request_notes_tta_request_id_created_at',
          fields: ['ttaRequestId', 'createdAt'],
        },
      ],
    }
  );

  return TtaRequestNote;
};
