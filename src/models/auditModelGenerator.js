/* eslint-disable max-len */
// Load in our dependencies
import { Model, DataTypes } from 'sequelize'; // eslint-disable-line import/no-import-module-exports
import httpContext from 'express-http-context'; // eslint-disable-line import/no-import-module-exports

const dmlType = ['INSERT', 'UPDATE', 'DELETE'];

const tryJsonParse = (data) => {
  let newData = data;
  if (data) {
    if (typeof data === 'object') {
      Object.entries(data).forEach(([key, value]) => {
        newData[key] = tryJsonParse(value);
      });
    } else if (typeof data === 'string') {
      try {
        newData = JSON.parse(data);
      } catch (e) {
        newData = data;
      }
    }
  }
  return newData;
};

const pgSetConfigIfNull = (settingName, value, alias) => `
  set_config(
    '${settingName}',
    COALESCE(NULLIF(current_setting('${settingName}', true),''), '${value}'),
    true
  ) as "${alias}"`;

const auditedTransactions = new Set();

const addAuditTransactionSettings = async (sequelize, instance, options, type, descriptor = undefined) => {
  const loggedUser = httpContext.get('loggedUser') ? httpContext.get('loggedUser') : '';
  const transactionId = httpContext.get('transactionId') ? httpContext.get('transactionId') : '';
  const sessionSig = httpContext.get('sessionSig') ? httpContext.get('sessionSig') : '';
  // eslint-disable-next-line no-unneeded-ternary
  const auditDescriptor = descriptor ? descriptor : (httpContext.get('auditDescriptor') || '');
  const { type: optionsType } = options || { type: '' };

  if (!auditedTransactions.has(transactionId) && !auditedTransactions.has(transactionId + optionsType)) {
    auditedTransactions.add(transactionId + optionsType);
    const statements = [
      pgSetConfigIfNull('audit.loggedUser', loggedUser, 'loggedUser'),
      pgSetConfigIfNull('audit.transactionId', transactionId, 'transactionId'),
      pgSetConfigIfNull('audit.sessionSig', sessionSig, 'sessionSig'),
      pgSetConfigIfNull('audit.auditDescriptor', auditDescriptor, 'auditDescriptor'),
    ];

    if (loggedUser !== '' || transactionId !== '' || auditDescriptor !== '') {
      return sequelize.queryInterface.sequelize.query(
        `SELECT
          '${type}' "Type",
          ${statements.join(',')};
        `.replace(/[\r\n]+/gm, ' '),
      );
    }
  }
  return Promise.resolve();
};

const removeFromAuditedTransactions = (options) => {
  const transactionId = httpContext.get('transactionId') ? httpContext.get('transactionId') : '';
  const { type: optionsType } = options || { type: '' };
  auditedTransactions.delete(transactionId + optionsType);
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

// eslint-disable-next-line
const attachHooksForAuditing = (sequelize) => {
  sequelize.addHook(
    'beforeBulkCreate',
    async (instance, options) => addAuditTransactionSettings(sequelize, instance, options, 'beforeBulkCreate'),
  );
  sequelize.addHook(
    'beforeBulkDestroy',
    async (options) => addAuditTransactionSettings(sequelize, null, options, 'beforeBulkDestroy'),
  );
  sequelize.addHook(
    'beforeBulkUpdate',
    async (options) => addAuditTransactionSettings(sequelize, null, options, 'beforeBulkUpdate'),
  );
  sequelize.addHook(
    'afterValidate',
    async (instance, options) => addAuditTransactionSettings(sequelize, instance, options, 'afterValidate'),
  );
  sequelize.addHook(
    'beforeCreate',
    async (instance, options) => addAuditTransactionSettings(sequelize, instance, options, 'beforeCreate'),
  );
  sequelize.addHook(
    'beforeDestroy',
    async (instance, options) => addAuditTransactionSettings(sequelize, instance, options, 'beforeDestroy'),
  );
  sequelize.addHook(
    'beforeUpdate',
    async (instance, options) => addAuditTransactionSettings(sequelize, instance, options, 'beforeUpdate'),
  );
  sequelize.addHook(
    'beforeSave',
    async (instance, options) => addAuditTransactionSettings(sequelize, instance, options, 'beforeSave'),
  );
  sequelize.addHook(
    'beforeUpsert',
    async (created, options) => addAuditTransactionSettings(sequelize, created, options, 'beforeUpsert'),
  );

  sequelize.addHook(
    'afterCreate',
    (instance, options) => removeFromAuditedTransactions(options),
  );
  sequelize.addHook(
    'afterDestroy',
    (instance, options) => removeFromAuditedTransactions(options),
  );
  sequelize.addHook(
    'afterUpdate',
    (instance, options) => removeFromAuditedTransactions(options),
  );
  sequelize.addHook(
    'afterSave',
    (instance, options) => removeFromAuditedTransactions(options),
  );
  sequelize.addHook(
    'afterUpsert',
    (instance, options) => removeFromAuditedTransactions(options),
  );
};

module.exports = {
  generateAuditModel,
  attachHooksForAuditing,
  addAuditTransactionSettings,
  removeFromAuditedTransactions,
};
