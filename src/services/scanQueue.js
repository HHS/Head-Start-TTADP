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
      password,
    };
  }
  const { REDIS_HOST: host, REDIS_PASS: password } = process.env;
  return {
    host,
    port: (process.env.REDIS_PORT || 6379),
    password,
  };
};

const {
  host,
  port,
  password,
} = generateRedisConfig();

const scanQueue = new Queue('scan', `redis://${host}:${port}`, { redis: { password } });

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
