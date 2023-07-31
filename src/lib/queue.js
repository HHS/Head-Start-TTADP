import Queue from 'bull';

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
    redisOpts: {
      redis: { password },
      defaultJobOptions: {
        attempts: 3,
        removeOnComplete: true,
        backoff: {
          type: 'exponential',
        },
      },
    },
  };
};

const {
  host,
  port,
  redisOpts,
} = generateRedisConfig();

export { generateRedisConfig };

const queues = {};

export default function newQueue(queName) {
  queues[queName] = new Queue(queName, `redis://${host}:${port}`, redisOpts);
  return queues[queName];
}

export async function increaseListeners(queue, num = 1) {
  const redisClient = queue.client;
  const maxListeners = redisClient.getMaxListeners();
  const currentCounts = queue.eventNames().reduce((counts, eventName) => ({
    ...counts,
    [eventName]: queue.listenerCount(eventName),
  }), {});
  const totalCount = Object.values(currentCounts).reduce((acc, count) => acc + count, 0);
  if (totalCount + num > maxListeners) {
    redisClient.setMaxListeners(Math.max(totalCount + num, maxListeners));
  }
  console.log(queue.name, currentCounts, totalCount, num, maxListeners, redisClient.getMaxListeners());
}
