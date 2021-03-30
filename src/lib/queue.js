import Queue from 'bull';

const generateRedisConfig = () => {
  if (process.env.VCAP_SERVICES) {
    const {
      'aws-elasticache-redis': [{
        credentials: {
          host,
          port,
          password,
        },
      }],
    } = JSON.parse(process.env.VCAP_SERVICES);
    return {
      host,
      port,
      // TLS needs to be set to an empty object for redis on cloud.gov
      // eslint-disable-next-line no-empty-pattern
      redisOpts: { redis: { password, tls: {} } },
    };
  }
  const { REDIS_HOST: host, REDIS_PASS: password } = process.env;
  return {
    host,
    port: (process.env.REDIS_PORT || 6379),
    redisOpts: { redis: { password } },
  };
};

const {
  host,
  port,
  redisOpts,
} = generateRedisConfig();

export default function newQueue(queName) {
  return new Queue(queName, `redis://${host}:${port}`, redisOpts);
}
