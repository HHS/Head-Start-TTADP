/* eslint-disable import/no-dynamic-require */
/* eslint-disable global-require */
const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const cls = require('cls-hooked');
const httpContext = require('express-http-context'); // eslint-disable-line import/no-import-module-exports

const namespace = cls.createNamespace('transaction');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = require('../../config/config')[env];
const audit = require('./auditModelGenerator');
const { auditLogger } = require('../logger');

Sequelize.useCLS(namespace);
const db = {};

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

audit.attachHooksForAuditing(sequelize);

function isConnectionOpen() {
  const { pool } = sequelize.connectionManager;

  if (!pool) {
    return false;
  }

  // Check if there are any active connections in the pool
  // eslint-disable-next-line no-underscore-dangle
  const isOpen = pool._availableObjects.length > 0 || pool._inUseObjects.length > 0;
  return isOpen;
}

fs
  .readdirSync(__dirname)
  .filter((file) => (file.indexOf('.') !== 0)
    && (file !== basename)
    && (file !== 'auditModelGenerator.js')
    && (file !== 'auditModels.js')
    && (file.slice(-3) === '.js'))
  .forEach((file) => {
    try {
      const modelDef = require(path.join(__dirname, file));
      if (modelDef && modelDef.default) {
        const model = modelDef.default(sequelize, Sequelize);
        db[model.name] = model;
        // GrantRelationshipToActive is excluded here because it is a materialized view,
        // so we don't want a ZAL created for it.
        if (model.name !== 'RequestErrors' && model.name !== 'GrantRelationshipToActive') {
          const auditModel = audit.generateAuditModel(sequelize, model);
          db[auditModel.name] = auditModel;
        }
      }
    } catch (error) {
      auditLogger.error(JSON.stringify({ error, file }));
      throw error;
    }
  });

const descriptiveDetails = () => {
  const loggedUser = httpContext.get('loggedUser') || null;
  const transactionId = httpContext.get('transactionId') || null;
  const sessionSig = httpContext.get('sessionSig') || null;
  const impersonationId = httpContext.get('impersonationUserId') || null;
  const descriptor = httpContext.get('auditDescriptor') || null;

  return {
    ...(descriptor && { descriptor }),
    ...(loggedUser && { loggedUser }),
    ...(impersonationId && { impersonationId }),
    ...(sessionSig && { sessionSig }),
    ...(transactionId && { transactionId }),
  };
};

// make models for remaining audit system tables
{
  const model = audit.generateZALDDL(sequelize);
  db[model.name] = model;
}

{
  const model = audit.generateZADescriptor(sequelize);
  const auditModel = audit.generateAuditModel(sequelize, model);
  db[model.name] = model;
  db[auditModel.name] = auditModel;
}

{
  const model = audit.generateZAFilter(sequelize);
  const auditModel = audit.generateAuditModel(sequelize, model);
  db[model.name] = model;
  db[auditModel.name] = auditModel;
}

Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;
db.descriptiveDetails = descriptiveDetails;
db.isConnectionOpen = isConnectionOpen;

module.exports = db;

/* export default db; */
