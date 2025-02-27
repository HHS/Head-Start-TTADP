/* eslint-disable import/first */
const mockQueueConstructor = jest.fn(() => ({
  on: jest.fn(), // Mock the `.on` method
  close: jest.fn().mockResolvedValue(undefined), // Mock the `.close` method
}));
jest.mock('bull', () => jest.fn((...args) => mockQueueConstructor(...args)));

import { auditLogger } from '../logger';
import {
  generateRedisConfig,
  increaseListeners,
  setRedisConnectionName,
  // eslint-disable-next-line import/no-named-default
  default as newQueue,
} from './queue';

jest.mock('../logger', () => ({
  auditLogger: {
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('increaseListeners', () => {
  const MAX_LISTENERS = 20;
  let queue;
  let redisClient;

  beforeEach(() => {
    mockQueueConstructor.mockClear();
    redisClient = {
      getMaxListeners: jest.fn().mockReturnValue(10),
      setMaxListeners: jest.fn(),
    };
    queue = {
      client: redisClient,
      eventNames: jest.fn().mockReturnValue(['event1', 'event2']),
      listenerCount: jest.fn().mockImplementation((eventName) => {
        if (eventName === 'event1') return 5;
        if (eventName === 'event2') return 3;
        return 0;
      }),
    };
  });

  it('increases max listeners if new total exceeds current max', async () => {
    await increaseListeners(queue, 3);
    expect(redisClient.setMaxListeners).toHaveBeenCalledWith(11);
  });

  it('does not change max listeners if new total does not exceed current max', async () => {
    await increaseListeners(queue, 2);
    expect(redisClient.setMaxListeners).not.toHaveBeenCalled();
  });

  it('caps listener increase at MAX_LISTENERS constant', async () => {
    await increaseListeners(queue, 15);
    expect(redisClient.setMaxListeners).toHaveBeenCalledWith(MAX_LISTENERS);
  });

  it('does nothing if queue has no client', async () => {
    queue.client = null;
    await increaseListeners(queue, 1);
    expect(redisClient.setMaxListeners).not.toHaveBeenCalled();
  });
});

describe('generateRedisConfig with VCAP_SERVICES', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    mockQueueConstructor.mockClear();
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
});

describe('setRedisConnectionName', () => {
  beforeEach(() => {
    mockQueueConstructor.mockClear();
  });

  it('logs an error if setting the Redis connection name fails', async () => {
    const mockQueue = {
      client: {
        call: jest.fn().mockRejectedValue(new Error('Connection error')),
      },
    };
    const auditLoggerSpy = jest.spyOn(auditLogger, 'error');
    await setRedisConnectionName(mockQueue, 'testConnectionName');
    expect(auditLoggerSpy).toHaveBeenCalledWith('Failed to set Redis connection name:', expect.any(Error));
  });
});

describe('newQueue', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    mockQueueConstructor.mockClear();
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('creates a queue with default timeout when none is provided', () => {
    const queue = newQueue('test-queue');
    expect(mockQueueConstructor).toHaveBeenCalledWith(
      'test-queue',
      expect.stringMatching(/^redis:\/\/.+$/),
      expect.objectContaining({
        settings: {
          stalledInterval: 30000, // Default timeout
        },
      }),
    );
  });

  it('creates a queue with custom timeout when specified', () => {
    const queue = newQueue('test-queue', 60000); // Custom timeout
    expect(mockQueueConstructor).toHaveBeenCalledWith(
      'test-queue',
      expect.stringMatching(/^redis:\/\/.+$/),
      expect.objectContaining({
        settings: {
          stalledInterval: 60000, // Custom timeout
        },
      }),
    );
  });
});
