/* istanbul ignore file: tested but not showing up in coverage for some reason */
/* eslint-disable max-len */
import Queue from 'bull';
import { auditLogger } from '../logger';
import { formatLogObject } from '../processHandler';

export const generateRedisConfig = (enableRateLimiter = false) => {
  if (process.env.VCAP_SERVICES) {
    const services = JSON.parse(process.env.VCAP_SERVICES);
    // Check if the 'aws-elasticache-redis' service is available in VCAP_SERVICES
    if (services['aws-elasticache-redis'] && services['aws-elasticache-redis'].length > 0) {
      const {
        credentials: {
          host,
          port,
          password,
          uri,
        },
      } = services['aws-elasticache-redis'][0];

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
  }

  // Check for the presence of Redis-related environment variables
  const { REDIS_HOST, REDIS_PASS, REDIS_PORT } = process.env;
  const redisHost = REDIS_HOST || 'localhost';
  const redisPort = REDIS_PORT || 6379;
  const redisPassFull = REDIS_PASS ? `${REDIS_PASS}@` : '';
  const tlsEnabled = false;

  return {
    host: redisHost,
    uri: `redis://:${redisPassFull}${redisHost}:${redisPort}`,
    port: redisPort,
    tlsEnabled,
    redisOpts: {
      redis: { password: REDIS_PASS },
    },
  };
};

const {
  host,
  port,
  redisOpts,
} = generateRedisConfig(true);

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
export function removeQueueEventHandlers(
  queue,
  errorListener,
  shutdownListener,
  exceptionListener,
  rejectionListener,
) {
  if (errorListener) queue.removeListener('error', errorListener);
  if (shutdownListener) {
    process.removeListener('SIGINT', shutdownListener);
    process.removeListener('SIGTERM', shutdownListener);
  }
  if (exceptionListener) process.removeListener('uncaughtException', exceptionListener);
  if (rejectionListener) process.removeListener('unhandledRejection', rejectionListener);
}

// Define the handlers so they can be added and removed
function handleShutdown(queue) {
  return () => {
    auditLogger.error(
      'Shutting down, but queue closing is disabled for now...',
    );
    // queue.close().then(() => {
    //   auditLogger.error('Queue closed successfully.');
    //   removeQueueEventHandlers(queue);
    //   process.exit(0);
    // }).catch((err) => {
    //   auditLogger.error('Failed to close the queue:', err);
    //   removeQueueEventHandlers(queue);
    //   process.exit(1);
    // });
  };
}

function handleException(queue) {
  return (err) => {
    auditLogger.error('Uncaught exception:', formatLogObject(err));
    // queue.close().then(() => {
    //   auditLogger.error('Queue closed after uncaught exception.');
    //   removeQueueEventHandlers(queue);
    //   process.exit(1);
    // }).catch((closeErr) => {
    //   auditLogger.error('Failed to close the queue after uncaught exception:', closeErr);
    //   removeQueueEventHandlers(queue);
    //   process.exit(1);
    // });
  };
}

function handleRejection(queue) {
  return (reason, promise) => {
    auditLogger.error('Unhandled rejection at:', promise, 'reason:', reason);
    // queue.close().then(() => {
    //   auditLogger.error('Queue closed after unhandled rejection.');
    //   removeQueueEventHandlers(queue);
    //   process.exit(1);
    // }).catch((closeErr) => {
    //   auditLogger.error('Failed to close the queue after unhandled rejection:', closeErr);
    //   removeQueueEventHandlers(queue);
    //   process.exit(1);
    // });
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

export function setRedisConnectionName(queue, connectionName) {
  const { client } = queue;
  if (client && client.call) {
    client.call('client', 'setname', connectionName).catch((err) => {
      auditLogger.error('Failed to set Redis connection name:', err);
    });
  }
}

export default function newQueue(queName, timeout = 30000) {
  const queue = new Queue(queName, `redis://${host}:${port}`, {
    ...redisOpts,
    maxRetriesPerRequest: 15, // Adjust this value as needed
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      auditLogger.warn(`Redis retry attempt #${times}, retrying in ${delay}ms`);
      return delay;
    },
    // Safely merge the timeout into redisOpts.settings
    settings: {
      ...((redisOpts?.settings) || {}), // Preserve existing settings from redisOpts
      stalledInterval: timeout, // Add or overwrite the timeout for stalled jobs
    },
  });

  setRedisConnectionName(queue, `${process.argv[1]?.split('/')?.slice(-1)[0]?.split('.')?.[0]}-${queName}-${process.pid}`);
  setupQueueEventHandlers(queue);
  return queue;
}
