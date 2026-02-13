// Reset modules so our mocks are applied before module load.
jest.resetModules()

// Define a global auditLogger so that the module’s code (which uses auditLogger)
// finds it defined.
global.auditLogger = { log: jest.fn(), error: jest.fn(), warn: jest.fn() }

// --- Set up our mocks BEFORE importing the module under test ---

// We mock the logger module (if imported) to return our global auditLogger.
jest.mock('../../logger', () => ({
  auditLogger: global.auditLogger,
}))

// Mock the common functions so we can intercept calls made during cron enrollment.
jest.mock('./common', () => ({
  registerCronEnrollmentFunction: jest.fn(),
  addCronJob: jest.fn(),
  addQueueProcessor: jest.fn(),
  enqueueMaintenanceJob: jest.fn(), // in case it’s used by cron callbacks
}))

// Also, mock the import system module so we can control getImportSchedules.
jest.mock('../importSystem', () => ({
  download: jest.fn(),
  process: jest.fn(),
  moreToDownload: jest.fn(),
  moreToProcess: jest.fn(),
  getImportSchedules: jest.fn(),
}))

// Import needed dependencies.
const { CronJob } = require('cron')
const { MAINTENANCE_CATEGORY, MAINTENANCE_TYPE } = require('../../constants')
const { registerCronEnrollmentFunction, addCronJob } = require('./common')
const { getImportSchedules } = require('../importSystem')

// Import the module under test (in an isolated module context so that our mocks are used)
jest.isolateModules(() => {
  // eslint-disable-next-line global-require
  require('./import')
})

// Retrieve the cron enrollment callback that your module registered.
let enrollmentCallback
beforeAll(() => {
  if (registerCronEnrollmentFunction.mock.calls.length === 0) {
    throw new Error('registerCronEnrollmentFunction was not called')
  }
  // Save the callback so that we can invoke it with test parameters.
  // eslint-disable-next-line prefer-destructuring
  enrollmentCallback = registerCronEnrollmentFunction.mock.calls[0][0]
})

describe('Import Cron Enrollment', () => {
  beforeEach(() => {
    // Clear the mock call history before each test.
    jest.clearAllMocks()
  })

  test('should skip enrollment in non-production environments', async () => {
    expect(typeof enrollmentCallback).toBe('function')
    // Simulate a non-production environment.
    await enrollmentCallback('0', 0, 'development')
    expect(global.auditLogger.log).toHaveBeenCalledWith(
      'info',
      expect.stringContaining('Skipping import cron job enrollment in non-production environment (development)')
    )
    expect(addCronJob).not.toHaveBeenCalled()
  })

  test('should skip enrollment when instanceId is not "0"', async () => {
    expect(typeof enrollmentCallback).toBe('function')
    // Simulate production environment but an instanceId other than '0'.
    await enrollmentCallback('1', 0, 'production')
    expect(global.auditLogger.log).toHaveBeenCalledWith(
      'info',
      expect.stringContaining('Skipping import cron job enrollment on instance 1 in environment production')
    )
    expect(addCronJob).not.toHaveBeenCalled()
  })

  test('should skip enrollment when contextId is not 1', async () => {
    expect(typeof enrollmentCallback).toBe('function')
    // Simulate production with instanceId "0" but a contextId of 2.
    await enrollmentCallback('0', 2, 'production')
    expect(global.auditLogger.log).toHaveBeenCalledWith(
      'info',
      expect.stringContaining('Skipping import cron job enrollment on context 2 in environment production for instance 0')
    )
    expect(addCronJob).not.toHaveBeenCalled()
  })

  test('should register cron jobs in production with instanceId "0" and contextId 1', async () => {
    // Prepare a fake schedule list.
    const mockSchedules = [
      { id: 1, name: 'Import One', schedule: '0 0 * * *' },
      { id: 2, name: 'Import Two', schedule: '30 1 * * *' },
    ]
    getImportSchedules.mockResolvedValue(mockSchedules)

    await enrollmentCallback('0', 1, 'production')

    // Check that the registration log is issued.
    expect(global.auditLogger.log).toHaveBeenCalledWith(
      'info',
      expect.stringContaining('Registering import maintenance cron jobs for context 1 in environment production for instance 0')
    )
    expect(getImportSchedules).toHaveBeenCalled()

    // The code should add one cron job for each schedule.
    expect(addCronJob).toHaveBeenCalledTimes(mockSchedules.length)

    // For each schedule, verify the parameters and even test the job-creation function.
    mockSchedules.forEach((scheduleObj, index) => {
      expect(addCronJob).toHaveBeenNthCalledWith(
        index + 1,
        MAINTENANCE_CATEGORY.IMPORT,
        MAINTENANCE_TYPE.IMPORT_DOWNLOAD,
        expect.any(Function),
        scheduleObj.schedule,
        scheduleObj.name
      )
      // Retrieve the job creator function from the mock.
      const cronJobCreator = addCronJob.mock.calls[index][2]
      const testTimezone = 'UTC'
      // Create a CronJob via the creator function.
      const job = cronJobCreator(MAINTENANCE_CATEGORY.IMPORT, MAINTENANCE_TYPE.IMPORT_DOWNLOAD, testTimezone, scheduleObj.schedule)
      // Verify that a CronJob instance is returned and is configured correctly.
      expect(typeof job.start).toBe('function')
      expect(typeof job.stop).toBe('function')
      expect(job.cronTime.source).toBe(scheduleObj.schedule)
    })
  })

  test('should log error if getImportSchedules fails', async () => {
    const error = new Error('Failed to get schedules')
    getImportSchedules.mockRejectedValue(error)

    await enrollmentCallback('0', 1, 'production')

    expect(global.auditLogger.error).toHaveBeenCalledWith(expect.stringContaining(`Error registering import cron jobs: ${error.message}`), error)
  })
})
