import newQueue, { increaseListeners } from '../lib/queue';
import { auditLogger, logger } from '../logger';
import processFile from '../workers/files';
import referenceData from '../workers/referenceData';
import transactionQueueWrapper from '../workers/transactionWrapper';

const scanQueue = newQueue('scan');
const addToScanQueue = (fileKey) => {
  const retries = process.env.FILE_SCAN_RETRIES || 5;
  const delay = process.env.FILE_SCAN_BACKOFF_DELAY || 10000;
  const backOffOpts = {
    type: 'exponential',
    delay,
  };

  return scanQueue.add(
    {
      ...fileKey,
      ...referenceData(),
    },
    {
      attempts: retries,
      backoff: backOffOpts,
      removeOnComplete: true,
      removeOnFail: true,
    }
  );
};

const onFailedScanQueue = (job, error) =>
  auditLogger.alertError(
    `job ${job.data.key} failed with error ${error}`,
    'queue_job_failed',
    error
  );
const onCompletedScanQueue = (job, result) => {
  if (result.status === 200) {
    logger.info(
      `job ${job.data.key} completed with status ${result.status} and result ${JSON.stringify(result.data)}`
    );
  } else {
    auditLogger.alertError(
      `job ${job.data.key} completed with status ${result.status} and result ${JSON.stringify(result.data)}`,
      'queue_job_non_success_status',
      result
    );
  }
};
const processScanQueue = () => {
  // File Scanning
  scanQueue.on('failed', onFailedScanQueue);
  scanQueue.on('completed', onCompletedScanQueue);
  increaseListeners(scanQueue);
  const processFileFromJob = async (job) => processFile(job.data.key);
  scanQueue.process(transactionQueueWrapper(processFileFromJob, 'scan'));
};

export { onCompletedScanQueue, onFailedScanQueue, processScanQueue, scanQueue };
export default addToScanQueue;
