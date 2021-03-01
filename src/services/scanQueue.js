import Queue from 'bull';

const generateRedisConfig = () => {
  if (process.env.VCAP_SERVICES) {
    const {
      'aws-elasticache-redis': [{
        credentials: {
          host,
          port,
          // TLS needs to be set to an empty object for redis on cloud.gov
          // eslint-disable-next-line no-empty-pattern
          redisOpts: { redis: { password, tls: {} } },
        },
      }],
    } = JSON.parse(process.env.VCAP_SERVICES);
    return {
      host,
      port,
      redisOpts: { redis: { password } },
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

const scanQueue = new Queue('scan', `redis://${host}:${port}`, redisOpts);

const addToScanQueue = (fileKey) => {
  const retries = process.env.FILE_SCAN_RETRIES || 5;
  const delay = process.env.FILE_SCAN_BACKOFF_DELAY || 10000;
  const backOffOpts = {
    type: 'exponential',
    delay,
  };
  return scanQueue.add(fileKey, { attempts: retries, backoff: backOffOpts });
};

export {
  scanQueue,
};
export default addToScanQueue;
