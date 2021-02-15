const throng = require('throng');
const dotenv = require('dotenv');
const Queue = require('bull');
const axios = require('axios');
const FormData = require('form-data');
const logger = require('./logger');
const downloadFile = require('./s3');

dotenv.config(process.cwd(), '../.env');

const REDIS_HOST = process.env.REDIS_HOST || 'redis://127.0.0.1';
const REDIS_PORT = process.env.REDIS_PORT || '6379';
const { REDIS_PASS } = process.env;

const workers = process.env.WEB_CONCURRENCY || 2;

const maxJobsPerWorker = process.env.MAX_JOBS_PER_WORKER || 5;

const processFile = (key) => downloadFile(key).then((data) => {
  const form = new FormData();
  form.append('name', key);
  form.append('file', data.Body, { filename: key, contentType: data.ContentType });
  return axios.post(`${process.env.CLAMAV_ENDPOINT}/scan`, form, { headers: { ...form.getHeaders() } })
    .then((res) => res.data);
});

function start() {
  const scanQueue = new Queue('scan', `redis://${REDIS_HOST}:${REDIS_PORT}`, { redis: { password: REDIS_PASS } });
  scanQueue.on('failed', (job, error) => logger.error(`job ${job.data.key} failed with error ${error}`));
  scanQueue.on('completed', (job, result) => logger.info(`job ${job.data.key} completed with result "${result}"`));
  scanQueue.process(maxJobsPerWorker, async (job) => processFile(job.data.key));
}

throng({ workers, start });
