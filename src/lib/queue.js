/* istanbul ignore file: tested but not showing up in coverage for some reason */
/* eslint-disable max-len */
import Queue from 'bull';
import { randomBytes } from 'crypto';
import { auditLogger } from '../logger';

const MAX_LISTENERS = 50;
const QUEUE_LIST = new Set();

// Job retention settings - these limit how many completed/failed jobs are kept in Redis
export const KEEP_COMPLETED_JOBS = 5;
export const KEEP_FAILED_JOBS = 10;

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
              // limit to 1000 requests per minute by default
              max: process.env.REDIS_LIMITER_MAX || 1000,
              duration: process.env.REDIS_LIMITER_DURATION || 60000,
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
  const redisPassFull = REDIS_PASS ? `:${REDIS_PASS}@` : '';
  const tlsEnabled = false;

  return {
    host: redisHost,
    uri: `redis://${redisPassFull}${redisHost}:${redisPort}`,
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
  uri,
  redisOpts,
} = generateRedisConfig(true);

export function increaseListeners(queue, num = 1) {
  if (!queue) {
    auditLogger.error('Queue is not defined, cannot increase listeners');
    return;
  }
  const newMaxListeners = Math.min(
    queue.getMaxListeners() + num,
    MAX_LISTENERS,
  );
  queue.setMaxListeners(newMaxListeners);
  auditLogger.info(`Set max listeners for ${queue.name} to ${newMaxListeners}`);
}

let shuttingDown = false;
const gracefulShutdown = async (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  auditLogger.info(`Received ${signal}, closing server...`);
  try {
    await Promise.all(Array.from(QUEUE_LIST).map((queue) => queue.close()));
    process.exit(0);
  } catch (err) {
    auditLogger.error('Failed to close queues during shutdown:', err);
    process.exit(1);
  }
};

function registerQueueHandlers(queue) {
  if (queue) {
    QUEUE_LIST.add(queue);
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    queue.on('error', (err) => {
      auditLogger.error(`${queue.name} error`, err);
    });
    queue.on('failed', (job, err) => {
      auditLogger.error(
        `${queue.name} job failed (${job?.id ?? 'unknown'})`,
        err,
      );
    });
    queue.on('stalled', () => {
      auditLogger.error(`${queue.name} stalled`);
    });
  }
}

export default function newQueue(queueName, timeout = 30000) {
  const connectionId = randomBytes(8).toString('base64url').slice(0, 10);
  const queue = new Queue(queueName, uri || `redis://${host}:${port}`, {
    ...redisOpts,
    redis: {
      ...(redisOpts?.redis || {}),
      connectionName: `${queueName}-${process.pid}-${connectionId}`,
    },
    defaultJobOptions: {
      attempts: 10,
      removeOnFail: KEEP_FAILED_JOBS,
      removeOnComplete: KEEP_COMPLETED_JOBS,
    },
    settings: {
      ...(redisOpts?.settings || {}), // Preserve existing settings from redisOpts
      stalledInterval: timeout, // Add or overwrite the timeout for stalled jobs
    },
  });
  registerQueueHandlers(queue);
  return queue;
}
