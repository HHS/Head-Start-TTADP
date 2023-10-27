import Queue from 'bull';

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

export default function newQueue(queName) {
  return new Queue(queName, `redis://${host}:${port}`, redisOpts);
}
