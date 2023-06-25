const {
  testingOnly: {
    maintenanceQueue,
    onFailedMaintenance,
    onCompletedMaintenance,
    createMaintenanceLog,
    updateMaintenanceLog,
  },
  addQueueProcessor,
  hasQueueProcessor,
  removeQueueProcessor,
  processMaintenanceQueue,
  enqueueMaintenanceJob,
  maintenanceCommand,
} = require('./common');

const { MaintenanceLog } = require('../../models');
const { auditLogger, logger } = require('../../logger');

jest.mock('../../models', () => ({
  MaintenanceLog: {
    create: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock('../../logger', () => ({
  auditLogger: {
    error: jest.fn(),
  },
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Maintenance Queue', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onFailedMaintenance', () => {
    it('should log an error message to the audit logger', () => {
      const job = { name: 'test-job', data: { type: 'test-type' } };
      const error = new Error('test-error');
      onFailedMaintenance(job, error);
      expect(auditLogger.error).toHaveBeenCalledWith(`job ${job.name} failed for report ${job.data.type} with error ${error}`);
    });
  });

  describe('onCompletedMaintenance', () => {
    it('should log successful maintenance when result is not null', () => {
      const job = { name: 'test-job', data: { category: 'test-category', type: 'test-type' } };
      const result = 'test-result';
      onCompletedMaintenance(job, result);
      expect(logger.info).toHaveBeenCalledWith(`Successfully performed ${job.name} maintenance for ${job.data.category} ${job.data.type}`);
    });

    it('should log failed maintenance when result is null', () => {
      const job = { name: 'test-job', data: { category: 'test-category', type: 'test-type' } };
      const result = null;
      onCompletedMaintenance(job, result);
      expect(logger.error).toHaveBeenCalledWith(`Failed to perform ${job.name} maintenance for ${job.data.category} ${job.data.type}`);
    });
  });

  describe('addQueueProcessor', () => {
    it('should add a queue processor to the specified category', () => {
      const category = 'test-category';
      const processor = jest.fn();
      addQueueProcessor(category, processor);
      expect(hasQueueProcessor(category)).toBe(true);
    });
  });

  describe('removeQueueProcessor', () => {
    it('should remove a queue processor for a given category', () => {
      const category = 'test-category';
      const processor = jest.fn();
      addQueueProcessor(category, processor);
      removeQueueProcessor(category);
      expect(hasQueueProcessor(category)).toBe(false);
    });

    it('should not throw an error if the category does not exist in the queueProcessors object', () => {
      const category = 'non-existent-category';
      expect(() => removeQueueProcessor(category)).not.toThrow();
    });
  });

  describe('processMaintenanceQueue', () => {
    it('should attach event listeners for failed and completed tasks', () => {
      maintenanceQueue.on = jest.fn();
      processMaintenanceQueue();
      expect(maintenanceQueue.on).toHaveBeenCalledTimes(2);
      expect(maintenanceQueue.on).toHaveBeenCalledWith('failed', onFailedMaintenance);
      expect(maintenanceQueue.on).toHaveBeenCalledWith('completed', onCompletedMaintenance);
    });

    it('should process each category in the queue using its corresponding processor', () => {
      const category1 = 'test-category-1';
      const processor1 = jest.fn();
      const category2 = 'test-category-2';
      const processor2 = jest.fn();
      maintenanceQueue.process = jest.fn();

      addQueueProcessor(category1, processor1);
      addQueueProcessor(category2, processor2);
      processMaintenanceQueue();
      expect(maintenanceQueue.process).toHaveBeenCalledTimes(2);
      expect(maintenanceQueue.process).toHaveBeenCalledWith(category1, processor1);
      expect(maintenanceQueue.process).toHaveBeenCalledWith(category2, processor2);
    });
  });

  describe('enqueueMaintenanceJob', () => {
    it('should add a job to the maintenance queue if a processor is defined for the given category', () => {
      const data = { test: 'data' };
      const category = 'test-category';
      const processor = jest.fn();
      addQueueProcessor(category, processor);
      maintenanceQueue.add = jest.fn();
      enqueueMaintenanceJob(category, data);
      expect(maintenanceQueue.add).toHaveBeenCalledWith(category, data);
    });

    it('should log an error if no processor is defined for the given type', () => {
      const category = 'non-existent-category';
      enqueueMaintenanceJob(category);
      expect(auditLogger.error).toHaveBeenCalledWith(new Error(`Maintenance Queue Error: no processor defined for ${category}`));
    });
  });

  describe('createMaintenanceLog', () => {
    it('should create a new maintenance log object with the given category, type, and data', async () => {
      const category = 'test-category';
      const type = 'test-type';
      const data = { test: 'data' };
      const triggeredById = 1;
      const expectedLog = {
        id: 1,
        category,
        type,
        data,
        triggeredById,
      };
      MaintenanceLog.create.mockResolvedValue(expectedLog);
      const log = await createMaintenanceLog(category, type, data, triggeredById);
      expect(MaintenanceLog.create).toHaveBeenCalledWith({ category, type, data, triggeredById });
      expect(log).toEqual(expectedLog);
    });
  });

  describe('updateMaintenanceLog', () => {
    it('should update the MaintenanceLog table with the new data and success status for the specified log ID', async () => {
      const log = { id: 1 };
      const newData = { test: 'new-data' };
      const isSuccessful = true;
      await updateMaintenanceLog(log, newData, isSuccessful);
      expect(MaintenanceLog.update).toHaveBeenCalledWith(
        { data: newData, isSuccessful },
        { where: { id: log.id } },
      );
    });
  });

  describe('maintenanceCommand', () => {
    let callback;
    let category;
    let type;
    let data;
    let triggeredById;

    beforeEach(() => {
      callback = jest.fn();
      category = 'test-category';
      type = 'test-type';
      data = { test: 'data' };
      triggeredById = 1;
    });

    it('should create a new maintenance log', async () => {
      await maintenanceCommand(callback, category, type, data, triggeredById);
      expect(MaintenanceLog.create).toHaveBeenCalledWith({
        category,
        type,
        data,
        triggeredById,
      });
    });

    it('should execute the provided callback function and capture any returned data', async () => {
      const logMessages = [];
      const logBenchmarks = [];
      const result = { isSuccessful: true, data: { test: 'result-data' } };
      callback.mockResolvedValue(result);
      await maintenanceCommand(callback, category, type, data, triggeredById);
      expect(callback).toHaveBeenCalledWith(logMessages, logBenchmarks, 1);
    });

    it('should determine if the maintenance command was successful based on log messages and returned data', async () => {
      const logMessages = ['test-message'];
      const logBenchmarks = ['test-benchmark'];
      const result = { isSuccessful: true, data: { test: 'result-data' } };
      callback.mockResolvedValue(result);
      const isSuccessful = await maintenanceCommand(callback, category, type, data, triggeredById);
      expect(isSuccessful).toBe(true);
    });

    it('should merge any returned data into the original data object and update the maintenance log', async () => {
      const logMessages = ['test-message'];
      const logBenchmarks = ['test-benchmark'];
      const result = { isSuccessful: true, data: { test: 'result-data' } };
      const newData = {
        ...data,
        ...result.data,
      };
      callback.mockResolvedValue(result);
      const log = { id: 1, data };
      MaintenanceLog.create.mockResolvedValue(log);
      await maintenanceCommand(callback, category, type, data, triggeredById);
      expect(MaintenanceLog.update).toHaveBeenCalledWith({
        data: newData,
        isSuccessful: true,
      }, { where: { id: log.id } });
    });

    it('should log any errors that occur during the maintenance command execution', async () => {
      const errorMessage = 'test-error';
      callback.mockRejectedValue(new Error(errorMessage));
      await maintenanceCommand(callback, category, type, data, triggeredById);
      expect(auditLogger.error).toHaveBeenCalledWith(`Error occurred while running maintenance command: ${errorMessage}`);
    });

    it('should update the maintenance log with the error information', async () => {
      const errorMessage = 'test-error';
      const error = new Error(errorMessage);
      callback.mockRejectedValue(error);
      const log = { id: 1, data };
      MaintenanceLog.create.mockResolvedValue(log);
      await maintenanceCommand(callback, category, type, data, triggeredById);
      expect(MaintenanceLog.update).toHaveBeenCalledWith({
        data: {
          ...data,
          error: JSON.parse(JSON.stringify(error)),
          errorMessage,
        },
        isSuccessful: false,
      }, { where: { id: 1 } });
    });

    it('should return whether the maintenance command was successful or not', async () => {
      const result = { isSuccessful: true };
      callback.mockResolvedValue(result);
      const isSuccessful = await maintenanceCommand(callback, category, type, data, triggeredById);
      expect(isSuccessful).toBe(true);
    });
  });
});
