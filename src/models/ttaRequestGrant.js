const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class TtaRequestGrant extends Model {
    static associate(models) {
      TtaRequestGrant.belongsTo(models.TtaRequest, {
        foreignKey: 'ttaRequestId',
        onDelete: 'cascade',
        as: 'ttaRequest',
      });
      TtaRequestGrant.belongsTo(models.Grant, {
        foreignKey: 'grantId',
        onDelete: 'cascade',
        as: 'grant',
      });
    }
  }

  TtaRequestGrant.init(
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
      grantId: {
        allowNull: false,
        type: DataTypes.INTEGER,
        references: {
          model: 'Grants',
          key: 'id',
        },
      },
    },
    {
      sequelize,
      modelName: 'TtaRequestGrant',
      tableName: 'TtaRequestGrants',
      timestamps: true,
      indexes: [
        {
          name: 'tta_request_grants_tta_request_id_grant_id',
          unique: true,
          fields: ['ttaRequestId', 'grantId'],
        },
      ],
    }
  );

  return TtaRequestGrant;
};
