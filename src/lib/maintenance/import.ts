/* istanbul ignore file: tested but not getting picked up by coverage */
/* eslint-disable  @typescript-eslint/no-explicit-any */
import { CronJob } from 'cron'
import { MAINTENANCE_TYPE, MAINTENANCE_CATEGORY } from '../../constants'
import {
  addQueueProcessor,
  enqueueMaintenanceJob,
  maintenanceCommand,
  registerCronEnrollmentFunction,
  addCronJob,
  runMaintenanceCronJobs,
} from './common'
import { download as downloadImport, process as processImport, moreToDownload, moreToProcess, getImportSchedules } from '../importSystem'
import LockManager from '../lockManager'
import { auditLogger } from '../../logger'
import handlePostProcessing from '../importSystem/postProcess'

/**
 * Enqueues a maintenance job for imports with a specified type and optional parameters.
 *
 * @param {Object} params - The parameters for the maintenance job.
 * @param {typeof MAINTENANCE_TYPE[keyof typeof MAINTENANCE_TYPE]} params.type - The type of
 *        maintenance job to enqueue, must be a value from MAINTENANCE_TYPE.
 * @param {number} [params.id] - An optional numeric identifier for the job.
 * @param {string} [params.requiredLaunchScript] - An optional launch script required for the job.
 * @param {boolean} [params.requiresLock=false] - Whether the job requires a lock to execute.
 * @param {boolean} [params.holdLock=false] - Whether the job should hold the lock after execution.
 * @param {number} [params.timeout] - An optional timeout (in milliseconds) for the job. If not
 *        provided, `jobSettings` will be empty.
 *
 * @returns {Promise<any>} The result of the enqueueMaintenanceJob function.
 *
 * @throws {Error} Will throw an error if enqueueMaintenanceJob throws.
 */
const enqueueImportMaintenanceJob = async ({
  type,
  id,
  requiredLaunchScript,
  requiresLock = false,
  holdLock = false,
  timeout,
}: {
  type: (typeof MAINTENANCE_TYPE)[keyof typeof MAINTENANCE_TYPE]
  id?: number
  requiredLaunchScript?: string
  requiresLock?: boolean
  holdLock?: boolean
  timeout?: number // Optional timeout
}) =>
  enqueueMaintenanceJob({
    category: MAINTENANCE_CATEGORY.IMPORT,
    data: {
      type,
      id,
    },
    requiredLaunchScript,
    requiresLock,
    holdLock,
    jobSettings: timeout !== undefined ? { timeout } : {},
  })

/**
 * Asynchronously initiates the download of an import based on the provided identifier and manages
 * the maintenance tasks associated with the import process. It calls the `maintenanceCommand`
 * function with a callback that handles the download and enqueues further processing jobs
 * as needed.
 *
 * @param id - The unique identifier for the import to be downloaded.
 * @returns A promise that resolves to an object indicating the success status of the operation
 *          and containing the download results or an error if one occurred.
 *
 * The returned object has the following structure:
 * - isSuccessful: A boolean indicating whether the download and enqueue operations were successful.
 * - ...downloadResults: The results of the download operation, spread into the returned object.
 * - error (optional): Present if an error occurred during the operation, contains the error
 * details.
 *
 * Exceptions:
 * - If an error is thrown within the callback provided to `maintenanceCommand`, it is caught and
 *   encapsulated in the returned object with `isSuccessful` set to false.
 */
const importDownload = async (id) =>
  maintenanceCommand(
    // The maintenanceCommand function is called with a callback that performs the actual work.
    async (logMessages, logBenchmarks, triggeredById) => {
      try {
        // Attempt to download the import using the provided id.
        const downloadResults = await downloadImport(id)
        // Check if there are more items to download after the current batch.
        const [downloadMore, processMore] = await Promise.all([moreToDownload(id), moreToProcess(id)])

        // If there are more items to download, enqueue a job to download the next batch.
        if (downloadMore) {
          await enqueueImportMaintenanceJob({
            type: MAINTENANCE_TYPE.IMPORT_DOWNLOAD,
            id,
            timeout: 6000, // 10 min
          })
        }
        // If the download results have a length, enqueue a job to process the downloaded data.
        if (processMore) {
          await enqueueImportMaintenanceJob({
            type: MAINTENANCE_TYPE.IMPORT_PROCESS,
            id,
            timeout: 4500, // 7.5 min
          })
        }
        // Return an object indicating the success status and include the download results.
        return {
          isSuccessful: !Object.keys(downloadResults).includes('error'),
          ...downloadResults,
        }
      } catch (err) {
        // In case of an error, return an object indicating failure and the error itself.
        return { isSuccessful: false, error: err }
      }
    },
    // Additional parameters for the maintenanceCommand function to specify the category and type.
    MAINTENANCE_CATEGORY.IMPORT,
    MAINTENANCE_TYPE.IMPORT_DOWNLOAD,
    // Include the id in the options object for the maintenanceCommand.
    { id }
  )

/**
 * Asynchronously handles the import process for a given identifier (id).
 * It wraps the import logic within a maintenance command that provides logging
 * and benchmarking utilities. If there are more items to process after the current
 * import, it enqueues a new import maintenance job. It returns an object indicating
 * whether the import was successful and includes the process results or an error if one occurred.
 *
 * @param id - The identifier for the import process.
 * @returns A Promise that resolves to an object with a boolean 'isSuccessful' property
 * indicating the success of the import process, and may include additional process results
 * or an error object if an exception was caught.
 */
const importProcess = async (id) =>
  maintenanceCommand(
    // Wrap the import logic within a maintenance command that provides logging and benchmarking
    // utilities.
    async (_logMessages, _logBenchmarks, _triggeredById) => {
      auditLogger.log('info', 'import: importProcess->maintenanceCommand:')
      try {
        const lockManager = new LockManager(`${MAINTENANCE_TYPE.IMPORT_PROCESS}-${id}`)
        auditLogger.info(`Processing import ${id}`)
        auditLogger.info('Lock manager created')
        let result
        await lockManager.executeWithLock(async () => {
          // Process the import and await the results.
          const processResults = await processImport(id)
          auditLogger.log('info', `import: importProcess->maintenanceCommand: ${JSON.stringify({ processResults })}`)

          // Post process.
          // Uses the object set on the import.postProcessingActions field in the database.
          await handlePostProcessing(id)

          // Check if there are more items to process after the current import.
          const more = await moreToProcess(id)
          auditLogger.log('info', `import: importProcess->maintenanceCommand: ${JSON.stringify({ more })}`)
          if (more) {
            // If more items need processing, enqueue a new import maintenance job.
            await enqueueImportMaintenanceJob({
              type: MAINTENANCE_TYPE.IMPORT_PROCESS,
              id,
              timeout: 4500, // 7.5 min
            })
          }
          // Return the process results along with a success flag indicating the absence of
          // an 'error' key.
          result = {
            isSuccessful: !Object.keys(processResults).includes('error'),
            ...processResults,
          }
        })
        return result
      } catch (err) {
        // In case of an error, return an object indicating the process was not successful and
        // include the error.
        auditLogger.error(`Error processing import ${id}: ${err}`, err)
        return { isSuccessful: false, error: err }
      }
    },
    // Specify the maintenance category and type for this import process.
    MAINTENANCE_CATEGORY.IMPORT,
    MAINTENANCE_TYPE.IMPORT_PROCESS,
    // Provide additional context for the maintenance command with the id.
    { id }
  )

/**
 * Handles the maintenance job for different types of import actions.
 * Based on the job type, it delegates the task to the appropriate function.
 *
 * @param job - An object containing the details of the job, including its type and id.
 * @returns The result of the action performed by the delegated function.
 * @throws Will throw an error if the job type is not recognized.
 */
const importMaintenance = async (job) => {
  // Destructure the 'type' and 'id' properties from the job's data
  const { type, id } = job.data

  // Use a switch statement to determine the action based on the job type
  switch (type) {
    // If the job type is import download, call the importDownload function with the provided id
    case MAINTENANCE_TYPE.IMPORT_DOWNLOAD:
      return importDownload(id)
    // If the job type is import process, call the importProcess function with the provided id
    case MAINTENANCE_TYPE.IMPORT_PROCESS:
      return importProcess(id)
    // If the job type does not match any case, throw an error
    default:
      throw new Error('Unknown type')
  }
}

addQueueProcessor(MAINTENANCE_CATEGORY.IMPORT, importMaintenance)

registerCronEnrollmentFunction(async (instanceId, contextId, env) => {
  if (env !== 'production') {
    auditLogger.log('info', `Skipping import cron job enrollment in non-production environment (${env})`)
    return
  }

  if (instanceId !== '0') {
    auditLogger.log('info', `Skipping import cron job enrollment on instance ${instanceId} in environment ${env}`)
    return
  }

  if (contextId !== 1) {
    auditLogger.log('info', `Skipping import cron job enrollment on context ${contextId} in environment ${env} for instance ${instanceId}`)
    return
  }

  auditLogger.log('info', `Registering import maintenance cron jobs for context ${contextId} in environment ${env} for instance ${instanceId}`)

  try {
    const imports = await getImportSchedules()

    await Promise.all(
      imports.map(async ({ id, name, schedule: importSchedule }) => {
        addCronJob(
          MAINTENANCE_CATEGORY.IMPORT,
          MAINTENANCE_TYPE.IMPORT_DOWNLOAD,
          (category, type, timezone, schedule) =>
            new CronJob(
              schedule,
              async () => {
                await enqueueImportMaintenanceJob({ type, id })
              },
              null,
              true,
              timezone
            ),
          importSchedule,
          name
        )
      })
    )
  } catch (err) {
    auditLogger.error(`Error registering import cron jobs: ${err.message}`, err)
  }
})

export { enqueueImportMaintenanceJob, importDownload, importProcess, importMaintenance }
