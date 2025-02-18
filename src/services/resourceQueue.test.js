import Queue from 'bull';
import { RESOURCE_ACTIONS } from '../constants';
import {
  addGetResourceMetadataToQueue,
  resourceQueue,
  onFailedResourceQueue,
  onCompletedResourceQueue,
  processResourceQueue,
} from './resourceQueue';
import db, { Resource } from '../models';
import { auditLogger, logger } from '../logger';

jest.mock('bull');

describe('Resource queue manager tests', () => {
  let resource;
  const mockPassword = 'SUPERSECUREPASSWORD';
  const originalEnv = process.env;

  beforeAll(async () => {
    process.env.REDIS_PASS = mockPassword;
    resource = await Resource.create({ url: 'https://www.test-resource-queue.com' });
    jest.spyOn(resourceQueue, 'add').mockImplementation(() => jest.fn());
  });

  afterAll(async () => {
    await Resource.destroy({ where: { id: resource.id } });
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

  it('test schedule get resource metadata', async () => {
    await addGetResourceMetadataToQueue(resource.id, resource.key);
    expect(resourceQueue.add).toHaveBeenCalled();
  });

  it('calls resource.add', async () => {
    await addGetResourceMetadataToQueue(resource.id, resource.key);
    expect(resourceQueue.add).toHaveBeenCalledWith(
      RESOURCE_ACTIONS.GET_METADATA,
      {
        resourceId: resource.id,
        resourceUrl: resource.key,
        key: RESOURCE_ACTIONS.GET_METADATA,
        referenceData: {
          impersonationId: '',
          sessionSig: '',
          transactionId: '',
          userId: '',
        },
      },
      {
        attempts: process.env.RESOURCE_METADATA_RETRIES || 3,
        backoff: {
          type: 'exponential',
          delay: process.env.RESOURCE_METADATA_BACKOFF_DELAY || 10000,
        },
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
  });

  it('onFailedResourceQueue logs an error', () => {
    const job = { data: { key: 'test-key' } };
    const error = new Error('Test error');
    const auditLoggerSpy = jest.spyOn(auditLogger, 'error');
    onFailedResourceQueue(job, error);
    expect(auditLoggerSpy).toHaveBeenCalledWith('job test-key failed with error Error: Test error');
  });

  it('onCompletedResourceQueue logs info on success', () => {
    const job = { data: { key: 'test-key' } };
    const result = { status: 200, data: { message: 'Success' } };
    const loggerSpy = jest.spyOn(logger, 'info');
    onCompletedResourceQueue(job, result);
    expect(loggerSpy).toHaveBeenCalledWith('job test-key completed with status 200 and result {"message":"Success"}');
  });

  it('onCompletedResourceQueue logs error on failure', () => {
    const job = { data: { key: 'test-key' } };
    const result = { status: 400, data: { message: 'Failure' } };
    const auditLoggerSpy = jest.spyOn(auditLogger, 'error');
    onCompletedResourceQueue(job, result);
    expect(auditLoggerSpy).toHaveBeenCalledWith('job test-key completed with status 400 and result {"message":"Failure"}');
  });

  it('resourceQueue on failed event triggers onFailedResourceQueue', () => {
    const job = { data: { key: 'test-key' } };
    const error = new Error('Test error');
    const auditLoggerSpy = jest.spyOn(auditLogger, 'error');
    resourceQueue.on.mockImplementation((event, callback) => {
      if (event === 'failed') {
        callback(job, error);
      }
    });
    resourceQueue.on('failed', onFailedResourceQueue);
    expect(auditLoggerSpy).toHaveBeenCalledWith('job test-key failed with error Error: Test error');
  });

  it('resourceQueue on completed event triggers onCompletedResourceQueue', () => {
    const job = { data: { key: 'test-key' } };
    const result = { status: 200, data: { message: 'Success' } };
    const loggerSpy = jest.spyOn(logger, 'info');
    resourceQueue.on.mockImplementation((event, callback) => {
      if (event === 'completed') {
        callback(job, result);
      }
    });
    resourceQueue.on('completed', onCompletedResourceQueue);
    expect(loggerSpy).toHaveBeenCalledWith('job test-key completed with status 200 and result {"message":"Success"}');
  });

  it('processResourceQueue sets up listeners and processes the queue', () => {
    processResourceQueue();
    expect(resourceQueue.on).toHaveBeenCalled();
    expect(resourceQueue.process).toHaveBeenCalled();
  });
});
