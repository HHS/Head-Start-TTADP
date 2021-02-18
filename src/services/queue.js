import Queue from 'bull';

const REDIS_PORT = process.env.REDIS_PORT || 6379;
const { REDIS_HOST, REDIS_PASS } = process.env;

const scanQueue = new Queue('scan', `redis://${REDIS_HOST}:${REDIS_PORT}`, { redis: { password: REDIS_PASS } });

export default async function addToScanQueue(fileKey) {
  await scanQueue.add(fileKey);
}
