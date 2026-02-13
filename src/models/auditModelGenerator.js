/* eslint-disable max-len */
// Load in our dependencies
import { Model, DataTypes } from 'sequelize' // eslint-disable-line import/no-import-module-exports
import httpContext from 'express-http-context' // eslint-disable-line import/no-import-module-exports

const dmlType = ['INSERT', 'UPDATE', 'DELETE']

const tryJsonParse = (data) => {
  let newData = data
  if (data) {
    if (typeof data === 'object') {
      Object.entries(data).forEach(([key, value]) => {
        newData[key] = tryJsonParse(value)
      })
    } else if (typeof data === 'string') {
      try {
        newData = JSON.parse(data)
      } catch (e) {
        newData = data
      }
    }
  }
  return newData
}

const pgSetConfigIfNull = (settingName, value, alias) => `
  set_config(
    '${settingName}',
    COALESCE(NULLIF(current_setting('${settingName}', true),''), '${value}'),
    true
  ) as "${alias}"`

const auditedTransactions = new Set()

const addAuditTransactionSettings = async (sequelize, instance, options, type, descriptor = undefined) => {
  const loggedUser = httpContext.get('loggedUser') ? httpContext.get('loggedUser') : ''
  const transactionId = httpContext.get('transactionId') ? httpContext.get('transactionId') : ''
  const sessionSig = httpContext.get('sessionSig') ? httpContext.get('sessionSig') : ''
  const impersonationId = httpContext.get('impersonationUserId') ? httpContext.get('impersonationUserId') : ''
  // eslint-disable-next-line no-unneeded-ternary
  const auditDescriptor = descriptor ? descriptor : httpContext.get('auditDescriptor') || ''
  const { type: optionsType } = options || { type: '' }

  if (!auditedTransactions.has(transactionId) && !auditedTransactions.has(transactionId + optionsType)) {
    auditedTransactions.add(transactionId + optionsType)
    const statements = [
      pgSetConfigIfNull('audit.loggedUser', loggedUser, 'loggedUser'),
      pgSetConfigIfNull('audit.transactionId', transactionId, 'transactionId'),
      pgSetConfigIfNull('audit.sessionSig', sessionSig, 'sessionSig'),
      pgSetConfigIfNull('audit.auditDescriptor', auditDescriptor, 'auditDescriptor'),
      pgSetConfigIfNull('audit.impersonationUserId', impersonationId, 'impersonationUserId'),
    ]

    if (loggedUser !== '' || transactionId !== '' || auditDescriptor !== '') {
      return sequelize.queryInterface.sequelize.query(
        `SELECT
          '${type}' "Type",
          ${statements.join(',')};
        `.replace(/[\r\n]+/gm, ' ')
      )
    }
  }
  return Promise.resolve()
}

const removeFromAuditedTransactions = (options) => {
  const transactionId = httpContext.get('transactionId')
  const { type: optionsType } = options || { type: '' }
  if (transactionId) {
    auditedTransactions.delete(transactionId + optionsType)
  }
}

const generateModelClass = (sequelize, name, schema, tableName = null) => {
  const auditModelName = name
  const auditModel = class extends Model {}
  auditModel.init(schema, {
    sequelize,
    modelName: auditModelName,
    ...(tableName && { tableName }),
    createdAt: false,
    updatedAt: false,
  })
  module.exports[auditModelName] = auditModel
  return auditModel
}

const generateZALDDL = (sequelize) => {
  const name = 'ZALDDL'
  const schema = {
    id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: null,
      primaryKey: true,
      autoIncrement: true,
    },
    ddl_timestamp: {
      allowNull: false,
      type: DataTypes.DATE,
      defaultValue: null,
    },
    ddl_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: null,
    },
    session_sig: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    ddl_txid: {
      type: DataTypes.UUID,
      allowNull: false,
      validate: { isUUID: 'all' },
      defaultValue: null,
    },
    descriptor_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
    },
    command_tag: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    object_type: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    schema_name: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    object_identity: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
  }

  return generateModelClass(sequelize, name, schema, name)
}

const generateZADescriptor = (sequelize) => {
  const name = 'ZADescriptor'
  const schema = {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      primaryKey: true,
      autoIncrement: true,
    },
    descriptor: {
      allowNull: false,
      type: DataTypes.TEXT,
      defaultValue: null,
    },
  }

  return generateModelClass(sequelize, name, schema, name)
}

const generateZAFilter = (sequelize) => {
  const name = 'ZAFilter'
  const schema = {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      primaryKey: true,
      autoIncrement: true,
    },
    tableName: {
      allowNull: true,
      type: DataTypes.STRING,
      defaultValue: null,
    },
    columnName: {
      allowNull: false,
      type: DataTypes.STRING,
      defaultValue: null,
    },
  }

  return generateModelClass(sequelize, name, schema, name)
}

const generateAuditModel = (sequelize, model) => {
  const name = `ZAL${model.name}`
  const schema = {
    id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: null,
      primaryKey: true,
      autoIncrement: true,
    },
    data_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: null,
    },
    dml_type: {
      type: DataTypes.ENUM(...dmlType),
      allowNull: false,
      defaultValue: null,
    },
    old_row_data: {
      type: DataTypes.JSONB,
      allowNull: true,
      get() {
        return tryJsonParse(this.getDataValue('old_row_data'))
      },
      defaultValue: null,
    },
    new_row_data: {
      type: DataTypes.JSONB,
      allowNull: true,
      get() {
        return tryJsonParse(this.getDataValue('new_row_data'))
      },
      defaultValue: null,
    },
    dml_timestamp: {
      allowNull: false,
      type: DataTypes.DATE,
      defaultValue: null,
    },
    dml_by: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: null,
      comment: null,
    },
    dml_as: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: null,
      comment: null,
    },
    session_sig: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    dml_txid: {
      type: DataTypes.UUID,
      allowNull: false,
      validate: { isUUID: 'all' },
      defaultValue: null,
    },
    descriptor_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
    },
  }

  return generateModelClass(sequelize, name, schema, `ZAL${model.tableName}`)
}

// eslint-disable-next-line
const attachHooksForAuditing = (sequelize) => {
  sequelize.addHook('beforeBulkCreate', async (instance, options) => addAuditTransactionSettings(sequelize, instance, options, 'beforeBulkCreate'))
  sequelize.addHook('beforeBulkDestroy', async (options) => addAuditTransactionSettings(sequelize, null, options, 'beforeBulkDestroy'))
  sequelize.addHook('beforeBulkUpdate', async (options) => addAuditTransactionSettings(sequelize, null, options, 'beforeBulkUpdate'))
  sequelize.addHook('afterValidate', async (instance, options) => addAuditTransactionSettings(sequelize, instance, options, 'afterValidate'))
  sequelize.addHook('beforeCreate', async (instance, options) => addAuditTransactionSettings(sequelize, instance, options, 'beforeCreate'))
  sequelize.addHook('beforeDestroy', async (instance, options) => addAuditTransactionSettings(sequelize, instance, options, 'beforeDestroy'))
  sequelize.addHook('beforeUpdate', async (instance, options) => addAuditTransactionSettings(sequelize, instance, options, 'beforeUpdate'))
  sequelize.addHook('beforeSave', async (instance, options) => addAuditTransactionSettings(sequelize, instance, options, 'beforeSave'))
  sequelize.addHook('beforeUpsert', async (created, options) => addAuditTransactionSettings(sequelize, created, options, 'beforeUpsert'))

  sequelize.addHook('afterCreate', (instance, options) => removeFromAuditedTransactions(options))
  sequelize.addHook('afterDestroy', (instance, options) => removeFromAuditedTransactions(options))
  sequelize.addHook('afterUpdate', (instance, options) => removeFromAuditedTransactions(options))
  sequelize.addHook('afterSave', (instance, options) => removeFromAuditedTransactions(options))
  sequelize.addHook('afterUpsert', (instance, options) => removeFromAuditedTransactions(options))
}

export {
  generateZALDDL,
  generateZADescriptor,
  generateZAFilter,
  generateAuditModel,
  attachHooksForAuditing,
  addAuditTransactionSettings,
  removeFromAuditedTransactions,
}
