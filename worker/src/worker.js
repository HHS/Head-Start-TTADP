const throng = require('throng');
const dotenv = require('dotenv');
const Queue = require('bull');
const { logger, auditLogger } = require('./logger');
const { processFile } = require('./files');

dotenv.config(process.cwd(), '../.env');

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

// Number of workers to spawn
const workers = process.env.WORKER_CONCURRENCY || 2;

// Number of jobs per worker. Can be adjusted if clamav is getting bogged down
const maxJobsPerWorker = process.env.MAX_JOBS_PER_WORKER || 5;

// Pull jobs off the redis queue and process them.
function start() {
  const scanQueue = new Queue('scan', `redis://${host}:${port}`, { redis: { password } });
  scanQueue.on('failed', (job, error) => auditLogger.error(`job ${job.data.key} failed with error ${error}`));
  scanQueue.on('completed', (job, result) => {
    if (result.status === 200) {
      logger.info(`job ${job.data.key} completed with status ${result.status} and result ${result.data}`);
    } else {
      auditLogger.error(`job ${job.data.key} completed with status ${result.status} and result ${result.data}`);
    }
  });
  scanQueue.process(maxJobsPerWorker, (job) => processFile(job.data.key));
}

// spawn workers and start them
throng({ workers, start });
