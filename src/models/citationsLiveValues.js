// See docs/monitoring-fact-tables.md for column definitions and business rules.
// Read-only model for the citations_live_values view — PostgreSQL will reject any
// write attempts at the database level. Use Citation.scope('withLiveValues') to
// include these fields via a single LEFT JOIN rather than importing this model directly.
import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class CitationsLiveValues extends Model {
    static associate(models) {
      models.CitationsLiveValues.belongsTo(models.Citation, {
        foreignKey: 'id',
        as: 'citation',
        constraints: false,
      });
    }
  }
  CitationsLiveValues.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
    },
    last_tta: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    last_ar_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    last_closed_goal: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    last_closed_goal_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'CitationsLiveValues',
    tableName: 'citations_live_values',
    timestamps: false,
    paranoid: false,
  });
  return CitationsLiveValues;
};
