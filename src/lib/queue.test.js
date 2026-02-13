/* eslint-disable import/first */
jest.mock('bull', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    on: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
    getMaxListeners: jest.fn(() => 10),
    setMaxListeners: jest.fn(),
  })),
}));

import { auditLogger } from '../logger';
import {
  generateRedisConfig,
  increaseListeners,
  DEFAULT_QUEUE_ATTEMPTS,
  DEFAULT_REDIS_LIMITER_MAX,
  DEFAULT_REDIS_LIMITER_DURATION,
  KEEP_COMPLETED_JOBS,
  KEEP_FAILED_JOBS,
} from './queue';

jest.mock('../logger', () => ({
  auditLogger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}));

describe('increaseListeners', () => {
  let queue;

  beforeEach(() => {
    queue = {
      getMaxListeners: jest.fn().mockReturnValue(10),
      setMaxListeners: jest.fn(),
      name: 'test-queue',
    };
  });

  it('increases max listeners by the provided amount', () => {
    increaseListeners(queue, 3);
    expect(queue.setMaxListeners).toHaveBeenCalledWith(13);
  });

  it('logs and returns when queue is undefined', () => {
    increaseListeners(undefined, 1);
    expect(auditLogger.error).toHaveBeenCalledWith(
      'Queue is not defined, cannot increase listeners',
    );
  });
});

describe('job retention constants', () => {
  it('exports KEEP_COMPLETED_JOBS with correct value', () => {
    expect(KEEP_COMPLETED_JOBS).toBe(5);
  });

  it('exports KEEP_FAILED_JOBS with correct value', () => {
    expect(KEEP_FAILED_JOBS).toBe(10);
  });

  it('exports DEFAULT_QUEUE_ATTEMPTS with correct value', () => {
    expect(DEFAULT_QUEUE_ATTEMPTS).toBe(5);
  });

  it('exports default rate limiter values for 100 per 10 seconds', () => {
    expect(DEFAULT_REDIS_LIMITER_MAX).toBe(100);
    expect(DEFAULT_REDIS_LIMITER_DURATION).toBe(10000);
  });
});

describe('generateRedisConfig with VCAP_SERVICES', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // ////mockQueueConstructor.mockClear();
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns TLS enabled redis settings without rate limiter', () => {
    process.env.VCAP_SERVICES = JSON.stringify({
      'aws-elasticache-redis': [{
        credentials: {
          host: 'test-host',
          port: '1234',
          password: 'test-password',
          uri: 'test-uri',
        },
      }],
    });

    const config = generateRedisConfig();

    expect(config).toEqual({
      uri: 'test-uri',
      host: 'test-host',
      port: '1234',
      tlsEnabled: true,
      redisOpts: {
        redis: {
          password: 'test-password',
          tls: {},
        },
      },
    });
  });

  it('returns TLS enabled redis settings with rate limiter', () => {
    process.env.VCAP_SERVICES = JSON.stringify({
      'aws-elasticache-redis': [{
        credentials: {
          host: 'test-host',
          port: '1234',
          password: 'test-password',
          uri: 'test-uri',
        },
      }],
    });
    process.env.REDIS_LIMITER_MAX = '2000';
    process.env.REDIS_LIMITER_DURATION = '600000';

    const config = generateRedisConfig(true);

    expect(config).toEqual({
      uri: 'test-uri',
      host: 'test-host',
      port: '1234',
      tlsEnabled: true,
      redisOpts: {
        redis: {
          password: 'test-password',
          tls: {},
        },
        limiter: {
          max: '2000',
          duration: '600000',
        },
      },
    });
  });

  it('uses default rate limiter settings when env vars are absent', () => {
    process.env.VCAP_SERVICES = JSON.stringify({
      'aws-elasticache-redis': [{
        credentials: {
          host: 'test-host',
          port: '1234',
          password: 'test-password',
          uri: 'test-uri',
        },
      }],
    });
    delete process.env.REDIS_LIMITER_MAX;
    delete process.env.REDIS_LIMITER_DURATION;

    const config = generateRedisConfig(true);

    expect(config.redisOpts.limiter).toEqual({
      max: DEFAULT_REDIS_LIMITER_MAX,
      duration: DEFAULT_REDIS_LIMITER_DURATION,
    });
  });
});

describe('newQueue', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('creates a queue with default timeout when none is provided', async () => {
    const queueInstance = {
      on: jest.fn(),
      close: jest.fn(),
      setMaxListeners: jest.fn(),
    };
    const mockQueue = jest.fn().mockReturnValue({
      ...queueInstance,
    });

    jest.doMock('bull', () => ({
      __esModule: true,
      default: mockQueue,
    }));

    // eslint-disable-next-line global-require
    const { default: Queue } = require('bull');
    const newQueue = (await import('./queue')).default;

    newQueue('test-queue');

    expect(Queue).toHaveBeenCalledWith(
      'test-queue',
      expect.stringMatching(/^redis:\/\/.+$/),
      expect.objectContaining({
        redis: expect.objectContaining({
          connectionName: expect.any(String),
        }),
        defaultJobOptions: expect.objectContaining({
          attempts: DEFAULT_QUEUE_ATTEMPTS,
          removeOnComplete: KEEP_COMPLETED_JOBS,
          removeOnFail: KEEP_FAILED_JOBS,
        }),
        settings: expect.objectContaining({
          stalledInterval: 30000,
        }),
      }),
    );
    expect(queueInstance.on).toHaveBeenCalledWith('error', expect.any(Function));
    expect(queueInstance.on).toHaveBeenCalledWith('failed', expect.any(Function));
    expect(queueInstance.on).toHaveBeenCalledWith('stalled', expect.any(Function));
  });

  it('creates a queue with custom timeout when specified', async () => {
    const queueInstance = {
      on: jest.fn(),
      close: jest.fn(),
      setMaxListeners: jest.fn(),
    };
    const mockQueue = jest.fn().mockReturnValue({
      ...queueInstance,
    });

    jest.doMock('bull', () => ({
      __esModule: true,
      default: mockQueue,
    }));

    // eslint-disable-next-line global-require
    const { default: Queue } = require('bull');
    const newQueue = (await import('./queue')).default;

    newQueue('test-queue', 60000);

    expect(Queue).toHaveBeenCalledWith(
      'test-queue',
      expect.stringMatching(/^redis:\/\/.+$/),
      expect.objectContaining({
        redis: expect.objectContaining({
          connectionName: expect.any(String),
        }),
        defaultJobOptions: expect.objectContaining({
          attempts: DEFAULT_QUEUE_ATTEMPTS,
          removeOnComplete: KEEP_COMPLETED_JOBS,
          removeOnFail: KEEP_FAILED_JOBS,
        }),
        settings: expect.objectContaining({
          stalledInterval: 60000,
        }),
      }),
    );
    expect(queueInstance.on).toHaveBeenCalledWith('error', expect.any(Function));
    expect(queueInstance.on).toHaveBeenCalledWith('failed', expect.any(Function));
    expect(queueInstance.on).toHaveBeenCalledWith('stalled', expect.any(Function));
  });
});
