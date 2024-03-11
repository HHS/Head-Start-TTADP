import { CronJob } from 'cron';
import {
  enqueueImportMaintenanceJob,
  scheduleImportCrons,
  importSchedule,
  importDownload,
  importProcess,
  importMaintenance,
} from './import';
import { MAINTENANCE_TYPE, MAINTENANCE_CATEGORY } from '../../constants';
import {
  addCronJob,
  enqueueMaintenanceJob,
  maintenanceCommand,
} from './common';
import {
  download as downloadImport,
  process as processImport,
  moreToDownload,
  moreToProcess,
  getImportSchedules,
} from '../importSystem';
import LockManager from '../lockManager';

jest.mock('../lockManager');

jest.mock('cron', () => ({
  CronJob: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    // Add other methods and properties as needed
  })),
}));

jest.mock('./common', () => ({
  addCronJob: jest.fn(),
  addQueueProcessor: jest.fn(),
  enqueueMaintenanceJob: jest.fn(),
  maintenanceCommand: jest.fn(),
  runMaintenanceCronJobs: jest.fn(),
}));

jest.mock('../importSystem', () => ({
  download: jest.fn(),
  process: jest.fn(),
  moreToDownload: jest.fn(),
  moreToProcess: jest.fn(),
  getImportSchedules: jest.fn(),
}));

describe('import', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('enqueueImportMaintenanceJob', () => {
    it('should enqueue a maintenance job with the correct category and type', () => {
      const type = MAINTENANCE_TYPE.IMPORT_SCHEDULE;
      const id = 123;
      enqueueImportMaintenanceJob(type, id);
      expect(enqueueMaintenanceJob).toHaveBeenCalledWith(
        MAINTENANCE_CATEGORY.IMPORT,
        { type, id },
        undefined,
        false,
        false,
      );
    });

    it('should be able to enqueue a job without an id', () => {
      const type = MAINTENANCE_TYPE.IMPORT_SCHEDULE;
      enqueueImportMaintenanceJob(type);
      expect(enqueueMaintenanceJob).toHaveBeenCalledWith(
        MAINTENANCE_CATEGORY.IMPORT,
        { type, id: undefined },
        undefined,
        false,
        false,
      );
    });
  });

  describe('scheduleImportCrons', () => {
    it('should schedule cron jobs for each import schedule', async () => {
      const mockSchedules = [
        { id: 1, name: 'Import 1', schedule: '* * * * *' },
        { id: 2, name: 'Import 2', schedule: '0 0 * * *' },
      ];
      getImportSchedules.mockResolvedValue(mockSchedules);

      const result = await scheduleImportCrons();

      expect(getImportSchedules).toHaveBeenCalled();

      expect(addCronJob).toHaveBeenCalledTimes(mockSchedules.length);

      let index = 0;
      let { id, name, schedule } = mockSchedules[index];

      {
        expect(addCronJob).toHaveBeenNthCalledWith(
          index + 1,
          MAINTENANCE_CATEGORY.IMPORT,
          MAINTENANCE_TYPE.IMPORT_DOWNLOAD,
          expect.any(Function),
          schedule,
          name,
        );

        const [
          catagory,
          type,
          jobCommand,
          suppliedSchedule,
        ] = addCronJob.mock.calls[index];
        await jobCommand(catagory, type, '', suppliedSchedule, false, false);
        const [
          cronSchedule,
          callbackCommand,
          something,
          autoStart,
          timezone,
        ] = CronJob.mock.calls[index];
        await callbackCommand();
        expect(enqueueMaintenanceJob)
          .toHaveBeenNthCalledWith(
            index + 1,
            MAINTENANCE_CATEGORY.IMPORT,
            { type: MAINTENANCE_TYPE.IMPORT_DOWNLOAD, id },
            undefined,
            false,
            false,
          );
      }

      index = 1;
      ({ id, name, schedule } = mockSchedules[index]);

      {
        expect(addCronJob).toHaveBeenNthCalledWith(
          index + 1,
          MAINTENANCE_CATEGORY.IMPORT,
          MAINTENANCE_TYPE.IMPORT_DOWNLOAD,
          expect.any(Function),
          schedule,
          name,
        );

        const [
          category,
          type,
          jobCommand,
          suppliedSchedule,
        ] = addCronJob.mock.calls[index];
        await jobCommand(category, type, '', suppliedSchedule);
        const [
          cronSchedule,
          callbackCommand,
          something,
          autoStart,
          timezone,
        ] = CronJob.mock.calls[index];
        await callbackCommand();
        expect(enqueueMaintenanceJob)
          .toHaveBeenNthCalledWith(
            index + 1,
            MAINTENANCE_CATEGORY.IMPORT,
            { type: MAINTENANCE_TYPE.IMPORT_DOWNLOAD, id },
            undefined,
            false,
            false,
          );
      }

      expect(result?.isSuccessful).toBe(true);
    });

    it('should throw an error if retrieving import schedules fails', async () => {
      getImportSchedules.mockRejectedValue(new Error('Failed to retrieve schedules'));
      const result = await scheduleImportCrons();
      expect(result?.isSuccessful).toBe(false);
      expect(result?.error).toBe('Failed to retrieve schedules');
    });
  });

  describe('importSchedule', () => {
    it('should return an object with isSuccessful true when no errors occur', async () => {
      maintenanceCommand.mockResolvedValue({ isSuccessful: true });
      const id = 123;
      const scheduledImport = {
        id,
        name: 'Import 123',
        schedule: '0 0 * * *',
      };
      getImportSchedules.mockResolvedValue([scheduledImport]);

      const result = await importSchedule();

      expect(maintenanceCommand).toHaveBeenCalledTimes(1);
      expect(maintenanceCommand).toHaveBeenCalledWith(
        expect.any(Function),
        MAINTENANCE_CATEGORY.IMPORT,
        MAINTENANCE_TYPE.IMPORT_SCHEDULE,
      );
      const anonymousFunction = maintenanceCommand.mock.calls[0][0];
      await anonymousFunction();

      expect(getImportSchedules).toHaveBeenCalled();
      expect(addCronJob).toHaveBeenCalledTimes(1);
      expect(addCronJob)
        .toHaveBeenNthCalledWith(
          1,
          MAINTENANCE_CATEGORY.IMPORT,
          MAINTENANCE_TYPE.IMPORT_DOWNLOAD,
          expect.any(Function),
          scheduledImport.schedule,
          scheduledImport.name,
        );

      expect(result.isSuccessful).toBe(true);
    });

    it('should return an object with isSuccessful false and error when an error occurs', async () => {
      maintenanceCommand.mockResolvedValue({ isSuccessful: false });
      getImportSchedules.mockRejectedValue(new Error('Error fetching schedules'));
      const result = await importSchedule();
      expect(maintenanceCommand).toHaveBeenCalledTimes(1);
      expect(maintenanceCommand).toHaveBeenCalledWith(
        expect.any(Function),
        MAINTENANCE_CATEGORY.IMPORT,
        MAINTENANCE_TYPE.IMPORT_SCHEDULE,
      );
      const anonymousFunction = maintenanceCommand.mock.calls[0][0];
      const results = await anonymousFunction();

      expect(results.isSuccessful).toBe(false);
      expect(results.error).toBe('Error fetching schedules');
      expect(result.isSuccessful).toBe(false);
    });
  });

  describe('importDownload', () => {
    it('should return an object with isSuccessful true when download is successful', async () => {
      const id = 123;
      downloadImport.mockResolvedValue([{}, {}]);
      moreToDownload.mockResolvedValue(true);
      moreToProcess.mockResolvedValue(true);

      await importDownload(id);
      expect(maintenanceCommand).toHaveBeenCalledWith(
        expect.any(Function),
        MAINTENANCE_CATEGORY.IMPORT,
        MAINTENANCE_TYPE.IMPORT_DOWNLOAD,
        { id },
      );
      const anonymousFunction = maintenanceCommand.mock.calls[0][0];
      const results = await anonymousFunction();

      expect(downloadImport).toHaveBeenCalledWith(id);
      expect(moreToDownload).toHaveBeenCalledWith(id);
      expect(moreToProcess).toHaveBeenCalledWith(id);
      expect(enqueueMaintenanceJob).toHaveBeenCalledTimes(2);
      expect(enqueueMaintenanceJob)
        .toHaveBeenNthCalledWith(
          1,
          MAINTENANCE_CATEGORY.IMPORT,
          { type: MAINTENANCE_TYPE.IMPORT_DOWNLOAD, id },
          undefined,
          false,
          false,
        );
      expect(enqueueMaintenanceJob)
        .toHaveBeenNthCalledWith(
          2,
          MAINTENANCE_CATEGORY.IMPORT,
          { type: MAINTENANCE_TYPE.IMPORT_PROCESS, id },
          undefined,
          false,
          false,
        );
      expect(results?.isSuccessful).toBe(true);
    });

    it('should enqueue a processing job if there are items to process', async () => {
      const id = 123;
      downloadImport.mockResolvedValue([{}, {}]);
      moreToDownload.mockResolvedValue(true);

      await importDownload(id);
      expect(maintenanceCommand).toHaveBeenCalledWith(
        expect.any(Function),
        MAINTENANCE_CATEGORY.IMPORT,
        MAINTENANCE_TYPE.IMPORT_DOWNLOAD,
        { id },
      );
      const anonymousFunction = maintenanceCommand.mock.calls[0][0];
      await anonymousFunction();

      expect(downloadImport).toHaveBeenCalledWith(id);
      expect(moreToDownload).toHaveBeenCalledWith(id);
      expect(enqueueMaintenanceJob).toHaveBeenCalledTimes(2);
      expect(enqueueMaintenanceJob)
        .toHaveBeenNthCalledWith(
          2,
          MAINTENANCE_CATEGORY.IMPORT,
          { type: MAINTENANCE_TYPE.IMPORT_PROCESS, id },
          undefined,
          false,
          false,
        );
    });

    it('should return an object with isSuccessful false when download fails', async () => {
      const id = 123;
      downloadImport.mockResolvedValue([{}, {}]);
      moreToDownload.mockResolvedValue(true);
      downloadImport.mockRejectedValue(new Error('Download failed'));

      await importDownload(id);
      expect(maintenanceCommand).toHaveBeenCalledWith(
        expect.any(Function),
        MAINTENANCE_CATEGORY.IMPORT,
        MAINTENANCE_TYPE.IMPORT_DOWNLOAD,
        { id },
      );
      const anonymousFunction = maintenanceCommand.mock.calls[0][0];
      const results = await anonymousFunction();
      expect(results.isSuccessful).toBe(false);
      expect(results.error).toBeDefined();
    });
  });

  describe('importProcess', () => {
    afterEach(() => {
      jest.clearAllMocks();
    });
    it('should return an object with isSuccessful true when processing is successful', async () => {
      const id = 123;
      processImport.mockResolvedValue({});
      moreToProcess.mockResolvedValue(false);
      LockManager.mockImplementation(() => ({
        executeWithLock: jest.fn((cb) => cb()),
      }));

      await importProcess(id);
      expect(maintenanceCommand).toHaveBeenCalledWith(
        expect.any(Function),
        MAINTENANCE_CATEGORY.IMPORT,
        MAINTENANCE_TYPE.IMPORT_PROCESS,
        { id },
      );
      const anonymousFunction = maintenanceCommand.mock.calls[0][0];
      const results = await anonymousFunction();
      expect(results?.isSuccessful).toBe(true);
      expect(processImport).toHaveBeenCalledWith(id);
    });

    it('should enqueue a new job if there are more items to process', async () => {
      const id = 123;
      processImport.mockResolvedValue({});
      moreToProcess.mockResolvedValue(true);
      LockManager.mockImplementation(() => ({
        executeWithLock: jest.fn((cb) => cb()),
      }));

      await importProcess(id);
      expect(maintenanceCommand).toHaveBeenCalledWith(
        expect.any(Function),
        MAINTENANCE_CATEGORY.IMPORT,
        MAINTENANCE_TYPE.IMPORT_PROCESS,
        { id },
      );
      const anonymousFunction = maintenanceCommand.mock.calls[0][0];
      await anonymousFunction();

      expect(enqueueMaintenanceJob).toHaveBeenCalledWith(
        MAINTENANCE_CATEGORY.IMPORT,
        {
          type: MAINTENANCE_TYPE.IMPORT_PROCESS,
          id,
        },
        undefined,
        false,
        false,
      );
    });

    it('should not enqueue a new job if there are no more items to process', async () => {
      const id = 123;
      processImport.mockResolvedValue({});
      moreToProcess.mockResolvedValue(false);

      await importProcess(id);
      expect(maintenanceCommand).toHaveBeenCalledWith(
        expect.any(Function),
        MAINTENANCE_CATEGORY.IMPORT,
        MAINTENANCE_TYPE.IMPORT_PROCESS,
        { id },
      );
      const anonymousFunction = maintenanceCommand.mock.calls[0][0];
      await anonymousFunction();

      expect(enqueueMaintenanceJob).not.toHaveBeenCalledWith(
        MAINTENANCE_CATEGORY.IMPORT,
        {
          type: MAINTENANCE_TYPE.IMPORT_PROCESS,
          id,
        },
      );
    });

    it('should return an object with isSuccessful false when processing fails', async () => {
      const id = 123;
      processImport.mockRejectedValue(new Error('Processing failed'));

      await importProcess(id);
      expect(maintenanceCommand).toHaveBeenCalledWith(
        expect.any(Function),
        MAINTENANCE_CATEGORY.IMPORT,
        MAINTENANCE_TYPE.IMPORT_PROCESS,
        { id },
      );
      const anonymousFunction = maintenanceCommand.mock.calls[0][0];
      const results = await anonymousFunction();
      expect(results.isSuccessful).toBe(false);
      expect(results.error).toBeDefined();
    });
  });

  describe('importMaintenance', () => {
    it('should call the correct function based on the job type', async () => {
      const job = {
        data: {
          type: MAINTENANCE_TYPE.IMPORT_SCHEDULE,
          id: 123,
        },
      };

      await importMaintenance(job);

      expect(maintenanceCommand).toHaveBeenCalledWith(
        expect.any(Function),
        MAINTENANCE_CATEGORY.IMPORT,
        MAINTENANCE_TYPE.IMPORT_SCHEDULE,
      );
    });

    it('should throw an error if the job type is not recognized', async () => {
      const job = {
        data: {
          type: 'UNKNOWN_TYPE',
          id: 123,
        },
      };

      await expect(importMaintenance(job)).rejects.toThrow();
    });

    it('should handle import download jobs correctly', async () => {
      const job = {
        data: {
          type: MAINTENANCE_TYPE.IMPORT_DOWNLOAD,
          id: 123,
        },
      };

      await importMaintenance(job);

      expect(maintenanceCommand).toHaveBeenCalledWith(
        expect.any(Function),
        MAINTENANCE_CATEGORY.IMPORT,
        MAINTENANCE_TYPE.IMPORT_DOWNLOAD,
        { id: job.data.id },
      );
    });

    it('should handle import process jobs correctly', async () => {
      const job = {
        data: {
          type: MAINTENANCE_TYPE.IMPORT_PROCESS,
          id: 456,
        },
      };

      await importMaintenance(job);

      expect(maintenanceCommand).toHaveBeenCalledWith(
        expect.any(Function),
        MAINTENANCE_CATEGORY.IMPORT,
        MAINTENANCE_TYPE.IMPORT_PROCESS,
        { id: job.data.id },
      );
    });

    it('should return the result of the importSchedule function for schedule jobs', async () => {
      const job = {
        data: {
          type: MAINTENANCE_TYPE.IMPORT_SCHEDULE,
          id: 123,
        },
      };
      maintenanceCommand.mockResolvedValue({ isSuccessful: true });

      const result = await importMaintenance(job);

      expect(result?.isSuccessful).toBe(true);
    });

    it('should return the result of the importDownload function for download jobs', async () => {
      const job = {
        data: {
          type: MAINTENANCE_TYPE.IMPORT_DOWNLOAD,
          id: 123,
        },
      };

      maintenanceCommand.mockResolvedValue({ isSuccessful: true });

      const result = await importMaintenance(job);

      expect(result?.isSuccessful).toBe(true);
    });

    it('should return the result of the importProcess function for process jobs', async () => {
      const job = {
        data: {
          type: MAINTENANCE_TYPE.IMPORT_PROCESS,
          id: 456,
        },
      };

      maintenanceCommand.mockResolvedValue({ isSuccessful: true });

      const result = await importMaintenance(job);

      expect(result?.isSuccessful).toBe(true);
    });
  });
});
