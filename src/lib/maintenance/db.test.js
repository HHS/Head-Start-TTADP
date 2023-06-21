const { Op } = require('sequelize');
const { auditLogger } = require('../../logger');
const constants = require('../../constants');
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
const { sequelize, DBMaintenanceLog } = require('../../models');

const { DB_MAINTENANCE_TYPE, MAINTENANCE_TYPE } = constants;

describe('maintenance', () => {
  describe('maintenanceCommand', () => {
    it('should create a maintenance log entry and execute the command', async () => {
      const type = DB_MAINTENANCE_TYPE.VACUUM;
      const data = {};
      const command = `VACUUM FULL "${DBMaintenanceLog.getTableName()}";`;

      await maintenanceCommand(command, type, data);

      const log = await DBMaintenanceLog.findOne({ order: [['id', 'DESC']], raw: true });

      expect(log.type).toBe(type);
      expect(log.isSuccessful).toBe(true);
      expect(log.data?.messages.length > 0 && log.data.messages[0]).toContain(command);
      expect(log.data?.benchmarks.length > 0 && typeof log.data.benchmarks[0]).toBe('number');
    });

    it('should set isSuccessful to false if the command fails', async () => {
      const type = DB_MAINTENANCE_TYPE.VACUUM;
      const data = {};
      const command = 'VACUUM FULL my_table;';

      await maintenanceCommand(command, type, data);

      const log = await DBMaintenanceLog.findOne({ order: [['id', 'DESC']], raw: true });
      expect(log.type).toBe(type);
      expect(log.isSuccessful).toBe(false);
      expect(log.data?.messages?.length > 0 && log.data.messages[0]).toBe(false);
      expect(log.data?.benchmarks?.length > 0 && typeof log.data.benchmarks[0]).toBe(false);
      expect(log.data?.error && typeof log.data.error).toBe('object');
      expect(log.data?.errorMessage && typeof log.data.errorMessage).toBe('string');
    });
  });

  describe('tableMaintenanceCommand', () => {
    it('should execute the maintenance command with the table name', async () => {
      const command = 'VACUUM FULL';
      const type = DB_MAINTENANCE_TYPE.VACUUM;
      const model = DBMaintenanceLog;

      await tableMaintenanceCommand(command, type, model);

      const log = await DBMaintenanceLog.findOne({ order: [['id', 'DESC']], raw: true });

      expect(log.type).toBe(type);
      expect(log.isSuccessful).toBe(true);
      expect(log.data?.messages.length > 0 && log.data.messages[0]).toContain(command);
      expect(log.data?.benchmarks.length > 0 && typeof log.data.benchmarks[0]).toBe('number');
    });
  });

  describe('vacuumTable', () => {
    it('should call tableMaintenanceCommand with VACUUM and the given model', async () => {
      const model = DBMaintenanceLog;
      const type = DB_MAINTENANCE_TYPE.VACUUM;
      const command = 'VACUUM FULL';

      await vacuumTable(model);

      const log = await DBMaintenanceLog.findOne({ order: [['id', 'DESC']], raw: true });

      expect(log.type).toBe(type);
      expect(log.isSuccessful).toBe(true);
      expect(log.data?.messages.length > 0 && log.data.messages[0]).toContain(command);
      expect(log.data?.benchmarks.length > 0 && typeof log.data.benchmarks[0]).toBe('number');
    });
  });

  describe('reindexTable', () => {
    it('should call tableMaintenanceCommand with REINDEX and the given model', async () => {
      const model = DBMaintenanceLog;
      const type = DB_MAINTENANCE_TYPE.REINDEX;
      const command = 'REINDEX TABLE';

      await reindexTable(model);

      const log = await DBMaintenanceLog.findOne({ order: [['id', 'DESC']], raw: true });

      expect(log.type).toBe(type);
      expect(log.isSuccessful).toBe(true);
      expect(log.data?.messages.length > 0 && log.data.messages[0]).toContain(command);
      expect(log.data?.benchmarks.length > 0 && typeof log.data.benchmarks[0]).toBe('number');
    });
  });

  describe('vacuumTables', () => {
    it('should call vacuumTable for each model in the database', async () => {
      const listOfModels = Object.values(sequelize.models);
      const numOfModels = listOfModels.length;
      const preLog = await DBMaintenanceLog.findOne({ order: [['id', 'DESC']], raw: true });

      await vacuumTables();

      const type = DB_MAINTENANCE_TYPE.VACUUM;
      const command = 'VACUUM FULL';

      const logs = await DBMaintenanceLog.findAll({
        where: { id: { [Op.gt]: preLog.id } },
        order: [['id', 'DESC']],
        raw: true,
      });

      expect(logs.length).toBe(numOfModels);
      expect(logs.every((log) => log.isSuccessful)).toBe(true);
      expect(logs.every((log) => log.type === type)).toBe(true);
      expect(logs.every((log) => log.data?.messages.length > 0
        && log.data.messages[0].includes(command))).toBe(true);
      expect(logs.every((log) => log.data?.benchmarks.length > 0
        && typeof log.data.benchmarks[0] === 'number')).toBe(true);
    });
  });

  describe('reindexTables', () => {
    it('should call reindexTable for each model in the database', async () => {
      const listOfModels = Object.values(sequelize.models);
      const numOfModels = listOfModels.length;
      const preLog = await DBMaintenanceLog.findOne({ order: [['id', 'DESC']], raw: true });

      await reindexTables();

      const type = DB_MAINTENANCE_TYPE.REINDEX;
      const command = 'REINDEX TABLE';

      const logs = await DBMaintenanceLog.findAll({
        where: { id: { [Op.gt]: preLog.id } },
        order: [['id', 'DESC']],
        raw: true,
      });

      expect(logs.length).toBe(numOfModels);
      expect(logs.every((log) => log.isSuccessful)).toBe(true);
      expect(logs.every((log) => log.type === type)).toBe(true);
      expect(logs.every((log) => log.data?.messages.length > 0
        && log.data.messages[0].includes(command))).toBe(true);
      expect(logs.every((log) => log.data?.benchmarks.length > 0
        && typeof log.data.benchmarks[0] === 'number')).toBe(true);
    });
  });

  describe('dailyMaintenance', () => {
    it('should call vacuumTables and reindexTables', async () => {
      const listOfModels = Object.values(sequelize.models);
      const numOfModels = listOfModels.length;
      const preLog = await DBMaintenanceLog.findOne({ order: [['id', 'DESC']], raw: true });

      await dailyMaintenance();

      const type = DB_MAINTENANCE_TYPE.REINDEX;
      const command = 'REINDEX TABLE';

      const logs = await DBMaintenanceLog.findAll({
        where: { id: { [Op.gt]: preLog.id } },
        order: [['id', 'DESC']],
        raw: true,
      });

      expect(logs.length).toBe(numOfModels * 2);
      expect(logs.every((log) => log.isSuccessful)).toBe(true);
      expect(logs.every((log) => log.type === DB_MAINTENANCE_TYPE.REINDEX
        || log.type === DB_MAINTENANCE_TYPE.VACUUM)).toBe(true);
      expect(logs.every((log) => log.data?.messages.length > 0
        && (log.data.messages[0].includes('REINDEX TABLE')
          || log.data.messages[0].includes('VACUUM FULL')))).toBe(true);
      expect(logs.every((log) => log.data?.benchmarks.length > 0
        && typeof log.data.benchmarks[0] === 'number')).toBe(true);
    });
  });

  // d escribe('dbMaintenance', () => {
  //   i t('should call dailyMaintenance and log the result', async () => {
  //     const vacuumTablesStub = jest.fn().mockResolvedValue();
  //     const reindexTablesStub = jest.fn().mockResolvedValue();
  //     const auditLoggerInfoSpy = jest.spyOn(auditLogger, 'info');
  //     await dbMaintenance(vacuumTablesStub, reindexTablesStub);
  //     expect(vacuumTablesStub).toHaveBeenCalledTimes(1);
  //     expect(reindexTablesStub).toHaveBeenCalledTimes(1);
  //     expect(auditLoggerInfoSpy).toHaveBeenCalledTimes(1);
  //     expect(auditLoggerInfoSpy)
  //      .toHaveBeenCalledWith(expect.stringContaining('Database maintenance completed'));
  //   });

  //   i t('should log an error if dailyMaintenance fails', async () => {
  //     const vacuumTablesStub = jest.fn().mockRejectedValue(new Error('Failed'));
  //     const reindexTablesStub = jest.fn().mockResolvedValue();
  //     const auditLoggerErrorSpy = jest.spyOn(auditLogger, 'error');
  //     await dbMaintenance(vacuumTablesStub, reindexTablesStub);
  //     expect(vacuumTablesStub).toHaveBeenCalledTimes(1);
  //     expect(reindexTablesStub).toHaveBeenCalledTimes(0);
  //     expect(auditLoggerErrorSpy).toHaveBeenCalledTimes(1);
  //     expect(auditLoggerErrorSpy)
  //      .toHaveBeenCalledWith(expect.any(Error), expect.stringContaining('Database maintenance failed'));
  //   });
  // });
});
