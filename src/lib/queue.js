import Queue from 'bull';
import { logger } from '../logger';

const generateRedisConfig = () => {
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
    return {
      uri,
      host,
      port,
      tlsEnabled: true,
      // TLS needs to be set to an empty object for redis on cloud.gov
      // eslint-disable-next-line no-empty-pattern
      redisOpts: { redis: { password, tls: {} } },
    };
  }
  const { REDIS_HOST: host, REDIS_PASS: password } = process.env;
  return {
    host,
    uri: `redis://:${password}@${host}:${process.env.REDIS_PORT || 6379}`,
    port: (process.env.REDIS_PORT || 6379),
    tlsEnabled: false,
    redisOpts: { redis: { password } },
  };
};

const {
  host,
  port,
  redisOpts,
} = generateRedisConfig();

export { generateRedisConfig };

export default function newQueue(queName) {
  return new Queue(queName, `redis://${host}:${port}`, redisOpts);
}
