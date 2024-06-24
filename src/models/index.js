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

// Function to gracefully close the Sequelize connection
const gracefulShutdown = async (msg) => {
  try {
    await sequelize.close();
    auditLogger.info(`Sequelize disconnected through ${msg}`);
  } catch (err) {
    auditLogger.error(`Error during Sequelize disconnection through ${msg}: ${err}`);
  }
};

// Listen for SIGINT (Ctrl+C)
process.on('SIGINT', async () => {
  await gracefulShutdown('app termination (SIGINT)');
  process.exit(0);
});

// Listen for SIGTERM (e.g., kill command)
process.on('SIGTERM', async () => {
  await gracefulShutdown('app termination (SIGTERM)');
  process.exit(0);
});

// Listen for uncaught exceptions
process.on('uncaughtException', async (err) => {
  auditLogger.error('Uncaught Exception:', err);
  await gracefulShutdown('uncaught exception');
  process.exit(1);
});

sequelize.addHook('beforeConnect', () => {
  auditLogger.info('Attempting to connect to the database');
});

sequelize.addHook('afterConnect', () => {
  auditLogger.info('Database connection established');
});

sequelize.addHook('beforeDisconnect', () => {
  auditLogger.info('Attempting to disconnect from the database');
});

sequelize.addHook('afterDisconnect', () => {
  auditLogger.info('Database connection closed');
});

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
db.gracefulShutdown = gracefulShutdown;

module.exports = db;

/* export default db; */
