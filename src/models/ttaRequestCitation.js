const { Model } = require('sequelize');

/**
 * A citation chosen on a TTA request for the monitoring goal. The form offers each citation
 * once across the selected grants, so a request's citations are unique by name.
 */
export default (sequelize, DataTypes) => {
  class TtaRequestCitation extends Model {
    static associate(models) {
      TtaRequestCitation.belongsTo(models.TtaRequest, {
        foreignKey: 'ttaRequestId',
        onDelete: 'cascade',
        as: 'ttaRequest',
      });
    }
  }

  TtaRequestCitation.init(
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
      citation: {
        allowNull: false,
        type: DataTypes.TEXT,
      },
      findingType: {
        allowNull: true,
        type: DataTypes.TEXT,
      },
    },
    {
      sequelize,
      modelName: 'TtaRequestCitation',
      tableName: 'TtaRequestCitations',
      timestamps: true,
      indexes: [
        {
          name: 'tta_request_citations_tta_request_id_citation',
          unique: true,
          fields: ['ttaRequestId', 'citation'],
        },
      ],
    }
  );

  return TtaRequestCitation;
};
