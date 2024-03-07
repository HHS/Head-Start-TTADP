import Queue from 'bull';
import { auditLogger } from '../logger';

const generateRedisConfig = (enableRateLimiter = false) => {
  if (process.env.VCAP_SERVICES) {
    const {
      'aws-elasticache-redis': [{
        credentials: {
          host,
          port,
          password,
          uri,
        },
      }],
    } = JSON.parse(process.env.VCAP_SERVICES);

    let redisSettings = {
      uri,
      host,
      port,
      tlsEnabled: true,
      // TLS needs to be set to an empty object for redis on cloud.gov
      // eslint-disable-next-line no-empty-pattern
      redisOpts: {
        redis: { password, tls: {} },
      },
    };

    // Explicitly set the rate limiter settings.
    if (enableRateLimiter) {
      redisSettings = {
        ...redisSettings,
        redisOpts: {
          ...redisSettings.redisOpts,
          limiter: {
            max: process.env.REDIS_LIMITER_MAX || 1000,
            duration: process.env.REDIS_LIMITER_DURATION || 300000,
          },
        },
      };
    }

    return redisSettings;
  }
  const { REDIS_HOST: host, REDIS_PASS: password } = process.env;
  return {
    host,
    uri: `redis://:${password}@${host}:${process.env.REDIS_PORT || 6379}`,
    port: (process.env.REDIS_PORT || 6379),
    tlsEnabled: false,
    redisOpts: {
      redis: { password },
    },
  };
};

const {
  host,
  port,
  redisOpts,
} = generateRedisConfig(true);

export { generateRedisConfig };

export async function increaseListeners(queue, num = 1) {
  const MAX_LISTENERS = 20;
  const redisClient = queue.client;
  if (redisClient) {
    const maxListeners = redisClient.getMaxListeners();
    const currentCounts = queue.eventNames().reduce((counts, eventName) => ({
      ...counts,
      [eventName]: queue.listenerCount(eventName),
    }), {});
    const totalCount = Object.values(currentCounts).reduce((acc, count) => acc + count, 0);
    const newListenerCount = Math.min(totalCount + num, MAX_LISTENERS);
    if (newListenerCount > maxListeners) {
      redisClient.setMaxListeners(newListenerCount);
    }
  }
}

// Remove event handlers
function removeQueueEventHandlers(
  queue,
  errorListener,
  shutdownListener,
  exceptionListener,
  rejectionListener,
) {
  queue.removeListener('error', errorListener).catch((err) => auditLogger.error(err.message));
  process.removeListener('SIGINT', shutdownListener).catch((err) => auditLogger.error(err.message));
  process.removeListener('SIGTERM', shutdownListener).catch((err) => auditLogger.error(err.message));
  process.removeListener('uncaughtException', exceptionListener).catch((err) => auditLogger.error(err.message));
  process.removeListener('unhandledRejection', rejectionListener).catch((err) => auditLogger.error(err.message));
}

// Define the handlers so they can be added and removed
function handleShutdown(queue) {
  return () => {
    auditLogger.error('Shutting down, closing queue...');
    queue.close().then(() => {
      auditLogger.error('Queue closed successfully.');
      removeQueueEventHandlers(queue);
      process.exit(0);
    }).catch((err) => {
      auditLogger.error('Failed to close the queue:', err);
      removeQueueEventHandlers(queue);
      process.exit(1);
    });
  };
}

function handleException(queue) {
  return (err) => {
    auditLogger.error('Uncaught exception:', err);
    queue.close().then(() => {
      auditLogger.error('Queue closed after uncaught exception.');
      removeQueueEventHandlers(queue);
      process.exit(1);
    }).catch((closeErr) => {
      auditLogger.error('Failed to close the queue after uncaught exception:', closeErr);
      removeQueueEventHandlers(queue);
      process.exit(1);
    });
  };
}

function handleRejection(queue) {
  return (reason, promise) => {
    auditLogger.error('Unhandled rejection at:', promise, 'reason:', reason);
    queue.close().then(() => {
      auditLogger.error('Queue closed after unhandled rejection.');
      removeQueueEventHandlers(queue);
      process.exit(1);
    }).catch((closeErr) => {
      auditLogger.error('Failed to close the queue after unhandled rejection:', closeErr);
      removeQueueEventHandlers(queue);
      process.exit(1);
    });
  };
}

// Setup event handlers
function setupQueueEventHandlers(queue) {
  const shutdownListener = handleShutdown(queue);
  const exceptionListener = handleException(queue);
  const rejectionListener = handleRejection(queue);

  const errorListener = (err) => {
    auditLogger.error('Queue encountered an error:', err);
    queue.close().then(() => {
      auditLogger.error('Queue closed due to an error.');
      removeQueueEventHandlers(
        queue,
        errorListener,
        shutdownListener,
        exceptionListener,
        rejectionListener,
      );
    }).catch((closeErr) => {
      auditLogger.error('Failed to close the queue after an error:', closeErr);
      removeQueueEventHandlers(
        queue,
        errorListener,
        shutdownListener,
        exceptionListener,
        rejectionListener,
      );
    });
  };

  queue.on('error', errorListener);
  process.on('SIGINT', shutdownListener);
  process.on('SIGTERM', shutdownListener);
  process.on('uncaughtException', exceptionListener);
  process.on('unhandledRejection', rejectionListener);
}

function setRedisConnectionName(queue, connectionName) {
  const { client } = queue;
  if (client && client.call) {
    client.call('client', 'setname', connectionName).catch((err) => {
      auditLogger.error('Failed to set Redis connection name:', err);
    });
  }
}

export default function newQueue(queName) {
  const queue = new Queue(queName, `redis://${host}:${port}`, redisOpts);
  setRedisConnectionName(queue, `${process.argv[1]?.split('/')?.slice(-1)[0]?.split('.')?.[0]}-${queName}-${process.pid}`);
  // setupQueueEventHandlers(queue); // TODO - currently causing mor errors then fixing
  return queue;
}
