import Queue from 'bull';
import {
  addDeleteFileToQueue,
  s3Queue,
  onFailedS3Queue,
  onCompletedS3Queue,
  processS3Queue,
} from './s3Queue';
import { FILE_STATUSES, S3_ACTIONS } from '../constants';
import { KEEP_COMPLETED_JOBS, KEEP_FAILED_JOBS } from '../lib/queue';
import db, { File } from '../models';
import { auditLogger, logger } from '../logger';

jest.mock('bull');

describe('s3 queue manager tests', () => {
  let file;
  const mockPassword = 'SUPERSECUREPASSWORD';
  const originalEnv = process.env;

  beforeAll(async () => {
    process.env.REDIS_PASS = mockPassword;
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
    process.env = originalEnv;
  });

  beforeEach(() => {
    Queue.mockImplementation(() => ({
      add: jest.fn(),
      on: jest.fn(),
      process: jest.fn(),
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('test schedule delete file', async () => {
    await addDeleteFileToQueue(file.id, file.key);
    expect(s3Queue.add).toHaveBeenCalled();
  });

  it('calls s3.add', async () => {
    await addDeleteFileToQueue(file.id, file.key);
    expect(s3Queue.add).toHaveBeenCalledWith(
      S3_ACTIONS.DELETE_FILE,
      {
        fileId: file.id,
        fileKey: file.key,
        key: S3_ACTIONS.DELETE_FILE,
        referenceData: {
          impersonationId: '',
          sessionSig: '',
          transactionId: '',
          userId: '',
        },
      },
      {
        removeOnComplete: KEEP_COMPLETED_JOBS,
        removeOnFail: KEEP_FAILED_JOBS,
      },
    );
  });

  it('onFailedS3Queue logs an error', () => {
    const job = { data: { key: 'test-key' } };
    const error = new Error('Test error');
    const auditLoggerSpy = jest.spyOn(auditLogger, 'error');
    onFailedS3Queue(job, error);
    expect(auditLoggerSpy).toHaveBeenCalledWith('job test-key failed with error Error: Test error');
  });

  it('onCompletedS3Queue logs info on success', () => {
    const job = { data: { key: 'test-key' } };
    const result = { status: 200, data: { message: 'Success' } };
    const loggerSpy = jest.spyOn(logger, 'info');
    onCompletedS3Queue(job, result);
    expect(loggerSpy).toHaveBeenCalledWith('job test-key completed with status 200 and result {"message":"Success"}');
  });

  it('onCompletedS3Queue logs error on failure', () => {
    const job = { data: { key: 'test-key' } };
    const result = { status: 400, data: { message: 'Failure' } };
    const auditLoggerSpy = jest.spyOn(auditLogger, 'error');
    onCompletedS3Queue(job, result);
    expect(auditLoggerSpy).toHaveBeenCalledWith('job test-key completed with status 400 and result {"message":"Failure"}');
  });

  it('s3Queue on failed event triggers onFailedS3Queue', () => {
    const job = { data: { key: 'test-key' } };
    const error = new Error('Test error');
    const auditLoggerSpy = jest.spyOn(auditLogger, 'error');
    s3Queue.on.mockImplementation((event, callback) => {
      if (event === 'failed') {
        callback(job, error);
      }
    });
    s3Queue.on('failed', onFailedS3Queue);
    expect(auditLoggerSpy).toHaveBeenCalledWith('job test-key failed with error Error: Test error');
  });

  it('s3Queue on completed event triggers onCompletedS3Queue', () => {
    const job = { data: { key: 'test-key' } };
    const result = { status: 200, data: { message: 'Success' } };
    const loggerSpy = jest.spyOn(logger, 'info');
    s3Queue.on.mockImplementation((event, callback) => {
      if (event === 'completed') {
        callback(job, result);
      }
    });
    s3Queue.on('completed', onCompletedS3Queue);
    expect(loggerSpy).toHaveBeenCalledWith('job test-key completed with status 200 and result {"message":"Success"}');
  });

  it('processS3Queue sets up listeners and processes the queue', () => {
    processS3Queue();
    expect(s3Queue.on).toHaveBeenCalledWith('failed', onFailedS3Queue);
    expect(s3Queue.on).toHaveBeenCalledWith('completed', onCompletedS3Queue);
    expect(s3Queue.process).toHaveBeenCalled();
  });
});
