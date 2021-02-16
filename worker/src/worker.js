const throng = require('throng');
const dotenv = require('dotenv');
const Queue = require('bull');
const logger = require('./logger');
const { processFile } = require('./files');

dotenv.config(process.cwd(), '../.env');

const REDIS_HOST = process.env.REDIS_HOST || 'redis://127.0.0.1';
const REDIS_PORT = process.env.REDIS_PORT || '6379';
const { REDIS_PASS } = process.env;

const workers = process.env.WEB_CONCURRENCY || 2;

const maxJobsPerWorker = process.env.MAX_JOBS_PER_WORKER || 5;

function start() {
  const scanQueue = new Queue('scan', `redis://${REDIS_HOST}:${REDIS_PORT}`, { redis: { password: REDIS_PASS } });
  scanQueue.on('failed', (job, error) => logger.error(`job ${job.data.key} failed with error ${error}`));
  scanQueue.on('completed', (job, result) => logger.info(`job ${job.data.key} completed with status ${result.status} and result ${result.data}`));
  scanQueue.process(maxJobsPerWorker, (job) => processFile(job.data.key));
}

throng({ workers, start });
