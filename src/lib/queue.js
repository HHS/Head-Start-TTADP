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
export const DEFAULT_QUEUE_ATTEMPTS = 5;
export const DEFAULT_REDIS_LIMITER_MAX = 10;
export const DEFAULT_REDIS_LIMITER_DURATION = 1000;

const limiterConfig = (enableRateLimiter) => {
  if (!enableRateLimiter) {
    return {};
  }

  return {
    limiter: {
      // limit to 10 requests per second by default
      max: process.env.REDIS_LIMITER_MAX || DEFAULT_REDIS_LIMITER_MAX,
      duration: process.env.REDIS_LIMITER_DURATION || DEFAULT_REDIS_LIMITER_DURATION,
    },
  };
};

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
            ...limiterConfig(enableRateLimiter),
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
      ...limiterConfig(enableRateLimiter),
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
export const closeAllQueues = async (reason = 'shutdown') => {
  if (shuttingDown) return;
  shuttingDown = true;
  auditLogger.info(`Closing queues due to ${reason}...`);
  const queues = Array.from(QUEUE_LIST);
  const results = await Promise.allSettled(
    queues.map((queue) => queue.close()),
  );
  const failed = results
    .map((result, index) => ({ result, queue: queues[index] }))
    .filter(({ result }) => result.status === 'rejected');

  failed.forEach(({ result, queue }) => {
    auditLogger.error(
      `Failed to close queue ${queue?.name ?? 'unknown'} during shutdown`,
      result.reason,
    );
  });
};

function registerQueueHandlers(queue) {
  if (queue) {
    QUEUE_LIST.add(queue);
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
      attempts: DEFAULT_QUEUE_ATTEMPTS,
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
