import Queue from 'bull';
import {
  addDeleteFileToQueue,
  s3Queue,
  onFailedS3Queue,
  onCompletedS3Queue,
} from './s3Queue';
import { FILE_STATUSES, S3_ACTIONS } from '../constants';
import db, { File } from '../models';
import { logger, auditLogger } from '../logger';

jest.mock('bull');
jest.mock('../logger', () => ({
  logger: {
    info: jest.fn(),
  },
  auditLogger: {
    error: jest.fn(),
  },
}));

// Mocking environment variables
const originalEnv = process.env;
beforeEach(() => {
  jest.resetModules(); // Resets the module registry - the cache of all required modules.
  process.env = { ...originalEnv, REDIS_URL: 'redis://redis:6379' }; // Set the environment variable for the test
});

afterEach(() => {
  process.env = originalEnv; // Restore original environment variables
});

describe('s3 queue manager tests', () => {
  let file;
  beforeAll(async () => {
    file = await File.create({
      originalFileName: 'file-for-s3-delete.xlsx',
      key: 'file-for-s3-delete.xlsx',
      status: FILE_STATUSES.UPLOADED,
      fileSize: 123445,
    });
    jest.spyOn(s3Queue, 'add').mockImplementation(() => jest.fn());
  });
  afterAll(async () => {
    await File.destroy({ where: { id: file.id } });
    await db.sequelize.close();
  });

  it('test schedule delete file', async () => {
    await addDeleteFileToQueue(
      file.id,
      file.key,
    );
    expect(s3Queue.add).toHaveBeenCalled();
  });

  it('calls s3.add', async () => {
    await addDeleteFileToQueue(
      file.id,
      file.key,
    );
    expect(Queue).toHaveBeenCalledWith('s3', process.env.REDIS_URL, { redis: { password: undefined } });
    expect(s3Queue.add).toHaveBeenCalled();
  });

  // New tests for onFailedS3Queue and onCompletedS3Queue
  it('onFailedS3Queue logs an error', () => {
    const job = { data: { key: S3_ACTIONS.DELETE_FILE } };
    const error = new Error('Test error');

    onFailedS3Queue(job, error);
    expect(auditLogger.error).toHaveBeenCalledWith(`job ${job.data.key} failed with error ${error}`);
  });

  it('onCompletedS3Queue logs info on success', () => {
    const job = { data: { key: S3_ACTIONS.DELETE_FILE } };
    const result = { status: 200, data: { success: true } };

    onCompletedS3Queue(job, result);
    expect(logger.info).toHaveBeenCalledWith(`job ${job.data.key} completed with status ${result.status} and result ${JSON.stringify(result.data)}`);
  });

  it('onCompletedS3Queue logs error on failure', () => {
    const job = { data: { key: S3_ACTIONS.DELETE_FILE } };
    const result = { status: 500, data: { success: false } };

    onCompletedS3Queue(job, result);
    expect(auditLogger.error).toHaveBeenCalledWith(`job ${job.data.key} completed with status ${result.status} and result ${JSON.stringify(result.data)}`);
  });
});
