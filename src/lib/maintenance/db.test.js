const { Op } = require('sequelize');
const { MAINTENANCE_TYPE, MAINTENANCE_CATEGORY } = require('../../constants');
const {
  maintenanceCommand,
  tableMaintenanceCommand,
  vacuumTable,
  reindexTable,
  vacuumTables,
  reindexTables,
  dailyMaintenance,
  dbMaintenance,
} = require('./db');
const { sequelize, MaintenanceLog } = require('../../models');

describe('maintenance', () => {
  describe('maintenanceCommand', () => {
    it('should create a maintenance log entry and execute the command', async () => {
      const category = MAINTENANCE_CATEGORY.DB;
      const type = MAINTENANCE_TYPE.VACUUM_ANALYZE;
      const data = {};
      const command = `VACUUM ANALYZE "${MaintenanceLog.getTableName()}";`;

      await maintenanceCommand(command, category, type, data);

      const log = await MaintenanceLog.findOne({ order: [['id', 'DESC']], raw: true });

      expect(log.type).toBe(type);
      expect(log.isSuccessful).toBe(true);
      expect(log.data?.messages.length > 0 && log.data.messages[0]).toContain(command);
      expect(log.data?.benchmarks.length > 0 && typeof log.data.benchmarks[0]).toBe('number');
    });

    it('should set isSuccessful to false if the command fails', async () => {
      const category = MAINTENANCE_CATEGORY.DB;
      const type = MAINTENANCE_TYPE.VACUUM_ANALYZE;
      const data = {};
      const command = 'VACUUM ANALYZE my_table;';

      await maintenanceCommand(command, category, type, data);

      const log = await MaintenanceLog.findOne({ order: [['id', 'DESC']], raw: true });
      expect(log.type).toBe(type);
      expect(log.isSuccessful).toBe(false);
      expect(log.data?.messages?.length > 0).toBe(false);
      expect(log.data?.benchmarks?.length > 0).toBe(false);
      expect(log.data?.error && typeof log.data.error).toBe('object');
      expect(log.data?.errorMessage && typeof log.data.errorMessage).toBe('string');
    });
  });

  describe('tableMaintenanceCommand', () => {
    it('should execute the maintenance command with the table name', async () => {
      const command = 'VACUUM ANALYZE';
      const category = MAINTENANCE_CATEGORY.DB;
      const type = MAINTENANCE_TYPE.VACUUM_ANALYZE;
      const model = MaintenanceLog;

      await tableMaintenanceCommand(command, category, type, model);

      const log = await MaintenanceLog.findOne({ order: [['id', 'DESC']], raw: true });

      expect(log.type).toBe(type);
      expect(log.isSuccessful).toBe(true);
      expect(log.data?.messages.length > 0 && log.data.messages[0]).toContain(command);
      expect(log.data?.benchmarks.length > 0 && typeof log.data.benchmarks[0]).toBe('number');
    });
  });

  describe('vacuumTable', () => {
    it('should call tableMaintenanceCommand with VACUUM and the given model', async () => {
      const model = MaintenanceLog;
      const type = MAINTENANCE_TYPE.VACUUM_ANALYZE;
      const command = 'VACUUM ANALYZE';

      await vacuumTable(model);

      const log = await MaintenanceLog.findOne({ order: [['id', 'DESC']], raw: true });

      expect(log.type).toBe(type);
      expect(log.isSuccessful).toBe(true);
      expect(log.data?.messages.length > 0 && log.data.messages[0]).toContain(command);
      expect(log.data?.benchmarks.length > 0 && typeof log.data.benchmarks[0]).toBe('number');
    });
  });

  describe('reindexTable', () => {
    it('should call tableMaintenanceCommand with REINDEX and the given model', async () => {
      const model = MaintenanceLog;
      const type = MAINTENANCE_TYPE.REINDEX;
      const command = 'REINDEX TABLE';

      await reindexTable(model);

      const log = await MaintenanceLog.findOne({ order: [['id', 'DESC']], raw: true });

      expect(log.type).toBe(type);
      expect(log.isSuccessful).toBe(true);
      expect(log.data?.messages.length > 0 && log.data.messages[0]).toContain(command);
      expect(log.data?.benchmarks.length > 0 && typeof log.data.benchmarks[0]).toBe('number');
    });
  });

  describe('vacuumTables', () => {
    it('should call vacuumTable for each model in the database', async () => {
      const offset = 5;
      const limit = 5;
      const listOfModels = Object.values(sequelize.models)
        .sort((a, b) => b.getTableName().localeCompare(a.getTableName()))
        .slice(offset, offset + limit);
      const numOfModels = listOfModels.length;
      const preLog = await MaintenanceLog.findOne({ order: [['id', 'DESC']], raw: true });

      await vacuumTables(offset, limit);

      const type = MAINTENANCE_TYPE.VACUUM_ANALYZE;
      const command = 'VACUUM ANALYZE';

      const logs = await MaintenanceLog.findAll({
        where: { id: { [Op.gt]: preLog.id } },
        order: [['id', 'DESC']],
        raw: true,
      });

      expect(logs.length).toBe(numOfModels + 1);
      expect(logs.every((log) => log.isSuccessful)).toBe(true);
      expect(logs.every((log) => log.type === MAINTENANCE_TYPE.VACUUM_ANALYZE
        || log.type === MAINTENANCE_TYPE.VACUUM_TABLES)).toBe(true);
      expect(logs.every((log) => (log.data?.messages?.length > 0
        && (log.data.messages[0].includes('VACUUM ANALYZE')))
        || (log.type === MAINTENANCE_TYPE.VACUUM_TABLES))).toBe(true);
      expect(logs.every((log) => (log.data?.benchmarks?.length > 0
        && typeof log.data.benchmarks[0] === 'number')
        || (log.type === MAINTENANCE_TYPE.VACUUM_TABLES))).toBe(true);
    });
  });

  describe('reindexTables', () => {
    it('should call reindexTable for each model in the database', async () => {
      const offset = 5;
      const limit = 5;
      const listOfModels = Object.values(sequelize.models)
        .sort((a, b) => b.getTableName().localeCompare(a.getTableName()))
        .slice(offset, offset + limit);
      const numOfModels = listOfModels.length;
      const preLog = await MaintenanceLog.findOne({ order: [['id', 'DESC']], raw: true });

      await reindexTables(offset, limit);

      const type = MAINTENANCE_TYPE.REINDEX;
      const command = 'REINDEX TABLE';

      const logs = await MaintenanceLog.findAll({
        where: { id: { [Op.gt]: preLog.id } },
        order: [['id', 'DESC']],
        raw: true,
      });

      expect(logs.length).toBe(numOfModels + 1);
      expect(logs.every((log) => log.isSuccessful)).toBe(true);
      expect(logs.every((log) => log.type === MAINTENANCE_TYPE.REINDEX
        || log.type === MAINTENANCE_TYPE.REINDEX_TABLES)).toBe(true);
      expect(logs.every((log) => (log.data?.messages?.length > 0
        && (log.data.messages[0].includes('REINDEX TABLE')))
        || (log.type === MAINTENANCE_TYPE.REINDEX_TABLES))).toBe(true);
      expect(logs.every((log) => (log.data?.benchmarks?.length > 0
        && typeof log.data.benchmarks[0] === 'number')
        || (log.type === MAINTENANCE_TYPE.REINDEX_TABLES))).toBe(true);
    });
  });

  describe('dailyMaintenance', () => {
    it('should call vacuumTables and reindexTables', async () => {
      const offset = 5;
      const limit = 5;
      const listOfModels = Object.values(sequelize.models)
        .sort((a, b) => b.getTableName().localeCompare(a.getTableName()))
        .slice(offset, offset + limit);
      const numOfModels = listOfModels.length;
      const preLog = await MaintenanceLog.findOne({ order: [['id', 'DESC']], raw: true });

      await dailyMaintenance(offset, limit);

      const type = MAINTENANCE_TYPE.REINDEX;
      const command = 'REINDEX TABLE';

      const logs = await MaintenanceLog.findAll({
        where: { id: { [Op.gt]: preLog.id } },
        order: [['id', 'DESC']],
        raw: true,
      });

      expect(logs.length).toBe((numOfModels + 1) * 2 + 1);
      expect(logs.every((log) => log.isSuccessful)).toBe(true);
      expect(logs.every((log) => log.type === MAINTENANCE_TYPE.REINDEX
        || log.type === MAINTENANCE_TYPE.VACUUM_ANALYZE
        || log.type === MAINTENANCE_TYPE.REINDEX_TABLES
        || log.type === MAINTENANCE_TYPE.VACUUM_TABLES
        || log.type === MAINTENANCE_TYPE.DAILY_DB_MAINTENANCE)).toBe(true);
      expect(logs.every((log) => (log.data?.messages?.length > 0
        && (log.data.messages[0].includes('REINDEX TABLE')
          || log.data.messages[0].includes('VACUUM ANALYZE')))
        || (log.type === MAINTENANCE_TYPE.REINDEX_TABLES
          || log.type === MAINTENANCE_TYPE.VACUUM_TABLES
          || log.type === MAINTENANCE_TYPE.DAILY_DB_MAINTENANCE))).toBe(true);
      expect(logs.every((log) => (log.data?.benchmarks?.length > 0
        && typeof log.data.benchmarks[0] === 'number')
        || (log.type === MAINTENANCE_TYPE.REINDEX_TABLES
          || log.type === MAINTENANCE_TYPE.VACUUM_TABLES
          || log.type === MAINTENANCE_TYPE.DAILY_DB_MAINTENANCE))).toBe(true);
    });
  });

  describe('dbMaintenance', () => {
    it('test - vacuum', async () => {
      const offset = 5;
      const limit = 5;
      const listOfModels = Object.values(sequelize.models)
        .sort((a, b) => b.getTableName().localeCompare(a.getTableName()))
        .slice(offset, offset + limit);
      const numOfModels = listOfModels.length;
      const preLog = await MaintenanceLog.findOne({ order: [['id', 'DESC']], raw: true });

      await dbMaintenance({
        data: {
          type: MAINTENANCE_TYPE.VACUUM_ANALYZE,
          offset,
          limit,
        },
      });

      const type = MAINTENANCE_TYPE.VACUUM_ANALYZE;
      const command = 'VACUUM ANALYZE';

      const logs = await MaintenanceLog.findAll({
        where: { id: { [Op.gt]: preLog.id } },
        order: [['id', 'DESC']],
        raw: true,
      });

      expect(logs.length).toBe(numOfModels + 1);
      expect(logs.every((log) => log.isSuccessful)).toBe(true);
      expect(logs.every((log) => log.type === MAINTENANCE_TYPE.VACUUM_ANALYZE
        || log.type === MAINTENANCE_TYPE.VACUUM_TABLES)).toBe(true);
      expect(logs.every((log) => (log.data?.messages?.length > 0
        && (log.data.messages[0].includes('VACUUM ANALYZE')))
        || (log.type === MAINTENANCE_TYPE.VACUUM_TABLES))).toBe(true);
      expect(logs.every((log) => (log.data?.benchmarks?.length > 0
        && typeof log.data.benchmarks[0] === 'number')
        || (log.type === MAINTENANCE_TYPE.VACUUM_TABLES))).toBe(true);
    });

    it('test - reindex', async () => {
      const offset = 5;
      const limit = 5;
      const listOfModels = Object.values(sequelize.models)
        .sort((a, b) => b.getTableName().localeCompare(a.getTableName()))
        .slice(offset, offset + limit);
      const numOfModels = listOfModels.length;
      const preLog = await MaintenanceLog.findOne({ order: [['id', 'DESC']], raw: true });

      await dbMaintenance({
        data: {
          type: MAINTENANCE_TYPE.REINDEX,
          offset,
          limit,
        },
      });

      const type = MAINTENANCE_TYPE.REINDEX;
      const command = 'REINDEX TABLE';

      const logs = await MaintenanceLog.findAll({
        where: { id: { [Op.gt]: preLog.id } },
        order: [['id', 'DESC']],
        raw: true,
      });

      expect(logs.length).toBe(numOfModels + 1);
      expect(logs.every((log) => log.isSuccessful)).toBe(true);
      expect(logs.every((log) => log.type === MAINTENANCE_TYPE.REINDEX
        || log.type === MAINTENANCE_TYPE.REINDEX_TABLES)).toBe(true);
      expect(logs.every((log) => log.type === MAINTENANCE_TYPE.REINDEX
        || log.type === MAINTENANCE_TYPE.REINDEX_TABLES)).toBe(true);
      expect(logs.every((log) => (log.data?.messages?.length > 0
        && (log.data.messages[0].includes('REINDEX TABLE')
          || log.data.messages[0].includes('VACUUM ANALYZE')))
        || (log.type === MAINTENANCE_TYPE.REINDEX_TABLES))).toBe(true);
      expect(logs.every((log) => (log.data?.benchmarks?.length > 0
        && typeof log.data.benchmarks[0] === 'number')
        || (log.type === MAINTENANCE_TYPE.REINDEX_TABLES))).toBe(true);
    });

    it('test - daily maintenance', async () => {
      const offset = 5;
      const limit = 5;
      const listOfModels = Object.values(sequelize.models)
        .sort((a, b) => b.getTableName().localeCompare(a.getTableName()))
        .slice(offset, offset + limit);
      const numOfModels = listOfModels.length;
      const preLog = await MaintenanceLog.findOne({ order: [['id', 'DESC']], raw: true });

      await dbMaintenance({
        data: {
          type: MAINTENANCE_TYPE.DAILY_DB_MAINTENANCE,
          offset,
          limit,
        },
      });

      const type = MAINTENANCE_TYPE.REINDEX;
      const command = 'REINDEX TABLE';

      const logs = await MaintenanceLog.findAll({
        where: { id: { [Op.gt]: (preLog?.id || 0) } },
        order: [['id', 'DESC']],
        raw: true,
      });

      expect(logs.length).toBe((numOfModels + 1) * 2 + 1);
      expect(logs.every((log) => log.isSuccessful)).toBe(true);
      expect(logs.every((log) => log.type === MAINTENANCE_TYPE.REINDEX
        || log.type === MAINTENANCE_TYPE.VACUUM_ANALYZE
        || log.type === MAINTENANCE_TYPE.REINDEX_TABLES
        || log.type === MAINTENANCE_TYPE.VACUUM_TABLES
        || log.type === MAINTENANCE_TYPE.DAILY_DB_MAINTENANCE)).toBe(true);
      expect(logs.every((log) => (log.data?.messages?.length > 0
        && (log.data.messages[0].includes('REINDEX TABLE')
          || log.data.messages[0].includes('VACUUM ANALYZE')))
        || (log.type === MAINTENANCE_TYPE.REINDEX_TABLES
          || log.type === MAINTENANCE_TYPE.VACUUM_TABLES
          || log.type === MAINTENANCE_TYPE.DAILY_DB_MAINTENANCE))).toBe(true);
      expect(logs.every((log) => (log.data?.benchmarks?.length > 0
        && typeof log.data.benchmarks[0] === 'number')
        || (log.type === MAINTENANCE_TYPE.REINDEX_TABLES
          || log.type === MAINTENANCE_TYPE.VACUUM_TABLES
          || log.type === MAINTENANCE_TYPE.DAILY_DB_MAINTENANCE))).toBe(true);
    });

    it('should log an error if dailyMaintenance fails', async () => {
      let error;
      try {
        await dbMaintenance({ data: { type: null } });
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
    });
  });
});
