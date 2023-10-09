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
            max: 1000,
            duration: 300000,
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

export default function newQueue(queName) {
  return new Queue(queName, `redis://${host}:${port}`, redisOpts);
}
