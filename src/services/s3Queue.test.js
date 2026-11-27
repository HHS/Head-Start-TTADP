import Queue from 'bull';
import { FILE_STATUSES, S3_ACTIONS } from '../constants';
import { auditLogger, logger } from '../logger';

import { deleteFileFromS3 } from '../lib/s3';
import db, { File, FileDeletion } from '../models';
import {
  addDeleteFileToQueue,
  deleteFileJob,
  onCompletedS3Queue,
  onFailedS3Queue,
  processS3Queue,
  s3Queue,
} from './s3Queue';

jest.mock('bull');
jest.mock('../lib/s3', () => ({
  ...jest.requireActual('../lib/s3'),
  deleteFileFromS3: jest.fn(),
}));

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
        fileDeletionId: undefined,
        key: S3_ACTIONS.DELETE_FILE,
        referenceData: {
          impersonationId: '',
          sessionSig: '',
          transactionId: '',
          userId: '',
        },
      },
      { attempts: 5, backoff: { type: 'exponential', delay: 60000 } }
    );
  });

  it('onFailedS3Queue logs an error', () => {
    const job = { data: { key: 'test-key' } };
    const error = new Error('Test error');
    const auditLoggerSpy = jest.spyOn(auditLogger, 'alertError');
    onFailedS3Queue(job, error);
    expect(auditLoggerSpy).toHaveBeenCalledWith(
      'job test-key failed with error Error: Test error',
      'queue_job_failed',
      error
    );
  });

  it('onCompletedS3Queue logs info on success', () => {
    const job = { data: { key: 'test-key' } };
    const result = { status: 200, data: { message: 'Success' } };
    const loggerSpy = jest.spyOn(logger, 'info');
    onCompletedS3Queue(job, result);
    expect(loggerSpy).toHaveBeenCalledWith(
      'job test-key completed with status 200 and result {"message":"Success"}'
    );
  });

  it('onCompletedS3Queue logs error on failure', () => {
    const job = { data: { key: 'test-key' } };
    const result = { status: 400, data: { message: 'Failure' } };
    const auditLoggerSpy = jest.spyOn(auditLogger, 'alertError');
    onCompletedS3Queue(job, result);
    expect(auditLoggerSpy).toHaveBeenCalledWith(
      'job test-key completed with status 400 and result {"message":"Failure"}',
      'queue_job_non_success_status',
      result
    );
  });

  it('s3Queue on failed event triggers onFailedS3Queue', () => {
    const job = { data: { key: 'test-key' } };
    const error = new Error('Test error');
    const auditLoggerSpy = jest.spyOn(auditLogger, 'alertError');
    s3Queue.on.mockImplementation((event, callback) => {
      if (event === 'failed') {
        callback(job, error);
      }
    });
    s3Queue.on('failed', onFailedS3Queue);
    expect(auditLoggerSpy).toHaveBeenCalledWith(
      'job test-key failed with error Error: Test error',
      'queue_job_failed',
      error
    );
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
    expect(loggerSpy).toHaveBeenCalledWith(
      'job test-key completed with status 200 and result {"message":"Success"}'
    );
  });

  describe('deleteFileJob', () => {
    const makeDeletion = (key) => FileDeletion.create({ fileId: 1_999_999_999, key });
    const created = [];
    const track = async (key) => {
      const deletion = await makeDeletion(key);
      created.push(deletion.id);
      return deletion;
    };

    afterAll(async () => {
      await FileDeletion.destroy({ where: { id: created } });
    });

    it('deletes the S3 object and marks the outbox row complete', async () => {
      const deletion = await track('gone-key.txt');
      deleteFileFromS3.mockResolvedValueOnce({ ok: true });

      const result = await deleteFileJob({
        data: { fileId: 1, fileKey: 'gone-key.txt', fileDeletionId: deletion.id },
      });

      expect(deleteFileFromS3).toHaveBeenCalledWith('gone-key.txt', undefined);
      expect(result.status).toBe(200);
      expect((await deletion.reload()).completedAt).not.toBeNull();
    });

    it('keeps an object another File still uses but completes the outbox row', async () => {
      const deletion = await track(file.key);

      const result = await deleteFileJob({
        data: { fileId: 1, fileKey: file.key, fileDeletionId: deletion.id },
      });

      expect(deleteFileFromS3).not.toHaveBeenCalled();
      expect(result.data.keptBecauseInUse).toBe(true);
      expect((await deletion.reload()).completedAt).not.toBeNull();
    });

    it('throws so Bull retries when S3 fails, leaving the outbox row pending', async () => {
      const deletion = await track('flaky-key.txt');
      deleteFileFromS3.mockRejectedValueOnce(new Error('S3 unavailable'));

      await expect(
        deleteFileJob({
          data: { fileId: 1, fileKey: 'flaky-key.txt', fileDeletionId: deletion.id },
        })
      ).rejects.toThrow('S3 unavailable');

      expect((await deletion.reload()).completedAt).toBeNull();
    });

    it('still deletes jobs queued without an outbox row', async () => {
      deleteFileFromS3.mockResolvedValueOnce({ ok: true });

      await expect(
        deleteFileJob({ data: { fileId: 1, fileKey: 'legacy-key.txt' } })
      ).resolves.toMatchObject({ status: 200 });
      expect(deleteFileFromS3).toHaveBeenCalledWith('legacy-key.txt', undefined);
    });
  });

  it('processS3Queue sets up listeners and processes the queue', () => {
    processS3Queue();
    expect(s3Queue.on).toHaveBeenCalledWith('failed', onFailedS3Queue);
    expect(s3Queue.on).toHaveBeenCalledWith('completed', onCompletedS3Queue);
    expect(s3Queue.process).toHaveBeenCalled();
  });
});
