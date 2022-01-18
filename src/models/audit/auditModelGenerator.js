// Load in our dependencies
import { Model, DataTypes } from 'sequelize';
import httpContext from 'express-http-context';

const dmlType = ['INSERT', 'UPDATE', 'DELETE'];

// const exception = () => {
//   throw new Error(
//     'Audit log only allows reading and inserting data,'
//     + ' all modification and removal is not allowed.'
//   );
// };

const tryJsonParse = (fieldName) => {
  const data = this.getDataValue(fieldName);
  if (typeof data === 'object') {
    Object.entries(data).forEach(([key, value]) => {
      if (typeof value === 'string') {
        try {
          data[key] = JSON.parse(value);
        } catch (e) {
          data[key] = value;
        }
      }
    });
  }
  return data;
};

const generateAuditModel = (sequelize, model) => {
  const auditModelName = `ZZAuditLog${model.name}`;
  const auditModel = class extends Model {};

  auditModel.init({
    id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: null,
      primaryKey: true,
      autoIncrement: true,
    },
    data_id: { type: DataTypes.INTEGER },
    dml_type: {
      type: DataTypes.ENUM(...dmlType),
      allowNull: false,
    },
    old_row_data: {
      type: DataTypes.JSON,
      allowNull: true,
      get: tryJsonParse,
    },
    new_row_data: {
      type: DataTypes.JSON,
      allowNull: true,
      get: tryJsonParse,
    },
    dml_timestamp: {
      allowNull: false,
      type: DataTypes.DATE,
    },
    dml_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: null,
    },
    dml_txid: {
      type: DataTypes.UUID,
      allowNull: false,
      validate: { isUUID: 'all' },
    },
    descriptor_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
    },
  }, {
    sequelize,
    modelName: auditModelName,
    createdAt: false,
    updatedAt: false,
  });

  return auditModel;
};

// module.exports = { generateAuditModel };
