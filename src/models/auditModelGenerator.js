// Load in our dependencies
import { Model, DataTypes } from 'sequelize'; // eslint-disable-line import/no-import-module-exports
import httpContext from 'express-http-context'; // eslint-disable-line import/no-import-module-exports
import { auditLogger } from '../logger'; // eslint-disable-line import/no-import-module-exports

const dmlType = ['INSERT', 'UPDATE', 'DELETE'];

// const exception = () => {
//   throw new Error(
//     'Audit log only allows reading and inserting data,'
//     + ' all modification and removal is not allowed.'
//   );
// };

const tryJsonParse = (data) => {
  const newData = data;
  if (typeof data === 'object') {
    Object.entries(data).forEach(([key, value]) => {
      if (typeof value === 'string') {
        try {
          newData[key] = JSON.parse(value);
        } catch (e) {
          newData[key] = value;
        }
      } else {
        newData[key] = value;
      }
    });
  }
  return newData;
};

const addAuditTransactionSettings = async (sequelize, instance, options, type, name) => {
  const loggedUser = httpContext.get('loggedUser') ? httpContext.get('loggedUser') : '';
  const transactionId = httpContext.get('transactionId') ? httpContext.get('transactionId') : '';
  const sessionSig = httpContext.get('sessionSig') ? httpContext.get('sessionSig') : '';
  const auditDescriptor = httpContext.get('auditDescriptor') ? httpContext.get('auditDescriptor') : '';
  if (loggedUser !== '' || transactionId !== '' || auditDescriptor !== '') {
    const result = await sequelize.queryInterface.sequelize.query(
      `SELECT
        -- Type: ${type} Model: ${name}
        set_config('audit.loggedUser', '${loggedUser}', TRUE) as "loggedUser",
        set_config('audit.transactionId', '${transactionId}', TRUE) as "transactionId",
        set_config('audit.sessionSig', '${sessionSig}', TRUE) as "sessionSig",
        set_config('audit.auditDescriptor', '${auditDescriptor}', TRUE) as "auditDescriptor";`,
      { transaction: options.transaction },
    );
    // console.log(JSON.stringify(result)); // eslint-disable-line no-console
    auditLogger.info(JSON.stringify(result));
  }
};

const generateAuditModel = (sequelize, model) => {
  const auditModelName = `ZAL${model.name}`;
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
      get() { return tryJsonParse(this.getDataValue('old_row_data')); },
    },
    new_row_data: {
      type: DataTypes.JSON,
      allowNull: true,
      get() { return tryJsonParse(this.getDataValue('new_row_data')); },
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
  module.exports[auditModelName] = auditModel;
  return auditModel;
};

const attachHooksForAuditing = (sequelize, model) => {
  model.addHook(
    'beforeBulkCreate',
    (instance, options) => addAuditTransactionSettings(sequelize, instance, options, 'beforeBulkCreate', model.name),
  );
  model.addHook(
    'beforeBulkDestroy',
    (options) => addAuditTransactionSettings(sequelize, null, options, 'beforeBulkDestroy', model.name),
  );
  model.addHook(
    'beforeBulkUpdate',
    (options) => addAuditTransactionSettings(sequelize, null, options, 'beforeBulkUpdate', model.name),
  );
  model.addHook(
    'afterValidate',
    (instance, options) => addAuditTransactionSettings(sequelize, instance, options, 'afterValidate', model.name),
  );
  model.addHook(
    'beforeCreate',
    (instance, options) => addAuditTransactionSettings(sequelize, instance, options, 'beforeCreate', model.name),
  );
  model.addHook(
    'beforeDestroy',
    (instance, options) => addAuditTransactionSettings(sequelize, instance, options, 'beforeDestroy', model.name),
  );
  model.addHook(
    'beforeUpdate',
    (instance, options) => addAuditTransactionSettings(sequelize, instance, options, 'beforeUpdate', model.name),
  );
  model.addHook(
    'beforeSave',
    (instance, options) => addAuditTransactionSettings(sequelize, instance, options, 'beforeSave', model.name),
  );
  model.addHook(
    'beforeUpsert',
    (created, options) => addAuditTransactionSettings(sequelize, created, options, 'beforeUpsert', model.name),
  );
};

module.exports = { generateAuditModel, attachHooksForAuditing };
