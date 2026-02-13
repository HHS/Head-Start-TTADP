/* eslint-disable import/first */
if (process.env.NODE_ENV === 'production') {
  // eslint-disable-next-line global-require
  require('newrelic')
}

import {} from 'dotenv/config'
import httpContext from 'express-http-context'
import throng from 'throng'
import { EventEmitter } from 'events'
import { logger } from './logger'
import { registerEventListener } from './processHandler'
import { processScanQueue } from './services/scanQueue'
import { processResourceQueue } from './services/resourceQueue'
import { processS3Queue } from './services/s3Queue'
import { processNotificationQueue } from './lib/mailer'
import { processMaintenanceQueue, executeCronEnrollmentFunctions, runMaintenanceCronJobs } from './lib/maintenance'
import { isTrue } from './envParser'

EventEmitter.defaultMaxListeners = 25

// Number of workers to spawn
const workers = process.env.WORKER_CONCURRENCY || 2
const timezone = 'America/New_York'

// Wrap your process functions to use httpContext
async function start(contextId: number) {
  registerEventListener()

  httpContext.ns.run(async () => {
    httpContext.set('workerId', contextId)

    // File Scanning Queue
    processScanQueue()

    // S3 Queue.
    processS3Queue()

    // Resource Queue.
    processResourceQueue()
    // Notifications Queue
    processNotificationQueue()

    // Ensure only instance zero and the first Throng worker run the maintenance jobs
    logger.info(`Starting worker, cf_instance: ${process.env.CF_INSTANCE_INDEX}, contextId: ${contextId}`)
    if (process.env.CF_INSTANCE_INDEX === '0' || isTrue('FORCE_CRON')) {
      await executeCronEnrollmentFunctions(process.env.CF_INSTANCE_INDEX, contextId, process.env.NODE_ENV)
      runMaintenanceCronJobs(timezone)
    }

    // Maintenance Queue
    processMaintenanceQueue()
  })
}

// spawn workers and start them
throng({ workers, start })
