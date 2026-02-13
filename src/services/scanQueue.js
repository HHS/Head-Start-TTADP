import newQueue, { increaseListeners } from '../lib/queue'
import { logger, auditLogger } from '../logger'
import processFile from '../workers/files'
import transactionQueueWrapper from '../workers/transactionWrapper'
import referenceData from '../workers/referenceData'

const scanQueue = newQueue('scan')
const addToScanQueue = (fileKey) => {
  const retries = process.env.FILE_SCAN_RETRIES || 5
  const delay = process.env.FILE_SCAN_BACKOFF_DELAY || 10000
  const backOffOpts = {
    type: 'exponential',
    delay,
  }

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
  )
}

const onFailedScanQueue = (job, error) => auditLogger.error(`job ${job.data.key} failed with error ${error}`)
const onCompletedScanQueue = (job, result) => {
  if (result.status === 200) {
    logger.info(`job ${job.data.key} completed with status ${result.status} and result ${JSON.stringify(result.data)}`)
  } else {
    auditLogger.error(`job ${job.data.key} completed with status ${result.status} and result ${JSON.stringify(result.data)}`)
  }
}
const processScanQueue = () => {
  // File Scanning
  scanQueue.on('failed', onFailedScanQueue)
  scanQueue.on('completed', onCompletedScanQueue)
  increaseListeners(scanQueue)
  const processFileFromJob = async (job) => processFile(job.data.key)
  scanQueue.process(transactionQueueWrapper(processFileFromJob, 'scan'))
}

export { scanQueue, onFailedScanQueue, onCompletedScanQueue, processScanQueue }
export default addToScanQueue
