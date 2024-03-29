/* eslint-disable import/no-dynamic-require */
/* eslint-disable global-require */
const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const cls = require('cls-hooked');

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
        if (model.name !== 'RequestErrors') {
          const auditModel = audit.generateAuditModel(sequelize, model);
          db[auditModel.name] = auditModel;
        }
      }
    } catch (error) {
      auditLogger.error(JSON.stringify({ error, file }));
      throw error;
    }
  });

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

module.exports = db;

/* export default db; */
