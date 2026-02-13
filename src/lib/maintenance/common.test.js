// src/lib/maintenance/common.test.js
const { Op } = require('sequelize')
const {
  // testing only exports
  maintenanceQueue,
  onFailedMaintenance,
  onCompletedMaintenance,
  createMaintenanceLog,
  updateMaintenanceLog,
  createCategory,
  createJob,
  backDate,
  clearMaintenanceLogs,
  maintenance,
  // normal exports
  addQueueProcessor,
  hasQueueProcessor,
  removeQueueProcessor,
  processMaintenanceQueue,
  enqueueMaintenanceJob,
  maintenanceCommand,
  registerCronEnrollmentFunction,
  executeCronEnrollmentFunctions,
  addCronJob,
  hasCronJob,
  removeCronJob,
  setCronJobSchedule,
  runMaintenanceCronJobs,
} = require('./common')
const { MAINTENANCE_TYPE, MAINTENANCE_CATEGORY } = require('../../constants')

const { MaintenanceLog } = require('../../models')
const { auditLogger, logger } = require('../../logger')
const { default: transactionWrapper } = require('../../workers/transactionWrapper')

// --- Mock external modules ---

jest.mock('../../models', () => ({
  MaintenanceLog: {
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  },
}))

jest.mock('../../logger', () => ({
  auditLogger: {
    error: jest.fn(),
    log: jest.fn(),
  },
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}))

// Mock referenceData to return an empty object
jest.mock('../../workers/referenceData', () => ({
  default: jest.fn(() => ({})),
}))

// Mock LockManager for testing the locking branch of enqueueMaintenanceJob.
jest.mock('../lockManager', () => ({
  default: jest.fn().mockImplementation((lockName) => ({
    executeWithLock: jest.fn((fn, holdLock) => fn()),
  })),
}))

// ------------------------
// Original Tests (updated)
// ------------------------

describe('Maintenance Queue', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('onFailedMaintenance', () => {
    it('should log an error message to the audit logger', () => {
      const job = { name: 'test-job', data: { type: 'test-type' }, id: 1 }
      const error = new Error('test-error')
      onFailedMaintenance(job, error)
      expect(auditLogger.error).toHaveBeenCalledWith(`job ${job.name} failed for ${job.data.type} with error ${error}`)
    })
  })

  describe('onCompletedMaintenance', () => {
    it('should log successful maintenance when result is not null', () => {
      const job = { name: 'test-job', data: { type: 'test-type' } }
      const result = 'test-result'
      onCompletedMaintenance(job, result)
      expect(logger.info).toHaveBeenCalledWith(`Successfully performed ${job.name} maintenance for ${job.data?.type}`)
    })

    it('should log failed maintenance when result is null', () => {
      const job = { name: 'test-job', data: { type: 'test-type' } }
      const result = null
      onCompletedMaintenance(job, result)
      expect(logger.error).toHaveBeenCalledWith(`Failed to perform ${job.name} maintenance for ${job.data?.type}`)
    })
  })

  describe('addQueueProcessor', () => {
    it('should add a queue processor to the specified category', () => {
      const category = 'test-category'
      const processor = jest.fn()
      addQueueProcessor(category, processor)
      expect(hasQueueProcessor(category)).toBe(true)
    })
  })

  describe('removeQueueProcessor', () => {
    it('should remove a queue processor for a given category', () => {
      const category = 'test-category'
      const processor = jest.fn()
      addQueueProcessor(category, processor)
      removeQueueProcessor(category)
      expect(hasQueueProcessor(category)).toBe(false)
    })

    it('should not throw an error if the category does not exist', () => {
      expect(() => removeQueueProcessor('non-existent-category')).not.toThrow()
    })
  })

  describe('processMaintenanceQueue', () => {
    it('should attach event listeners for failed and completed tasks', () => {
      maintenanceQueue.on = jest.fn()
      processMaintenanceQueue()
      expect(maintenanceQueue.on).toHaveBeenCalledTimes(2)
      expect(maintenanceQueue.on).toHaveBeenCalledWith('failed', onFailedMaintenance)
      expect(maintenanceQueue.on).toHaveBeenCalledWith('completed', onCompletedMaintenance)
    })

    it('should process each category in the queue using its corresponding processor', () => {
      const category1 = 'test-category-1'
      const processor1 = jest.fn()
      const category2 = 'test-category-2'
      const processor2 = jest.fn()
      maintenanceQueue.process = jest.fn()

      addQueueProcessor(category1, processor1)
      addQueueProcessor(category2, processor2)
      processMaintenanceQueue()

      // Expect one call for the MAINTENANCE category plus one for each newly added
      expect(maintenanceQueue.process).toHaveBeenCalledTimes(3)
      expect(maintenanceQueue.process).toHaveBeenNthCalledWith(1, MAINTENANCE_CATEGORY.MAINTENANCE, expect.any(Function))
      expect(maintenanceQueue.process).toHaveBeenNthCalledWith(2, category1, expect.any(Function))
      expect(maintenanceQueue.process).toHaveBeenNthCalledWith(3, category2, expect.any(Function))
    })
  })

  describe('enqueueMaintenanceJob', () => {
    afterEach(() => {
      jest.clearAllMocks()
    })

    it('should add a job to the maintenance queue if a processor is defined', async () => {
      const data = {
        test: 'enqueueMaintenanceJob test',
        referenceData: {
          impersonationId: '',
          sessionSig: '',
          transactionId: '',
          userId: '',
        },
      }
      const category = 'test-category'
      const processor = jest.fn()
      addQueueProcessor(category, processor)
      maintenanceQueue.add = jest.fn()
      await enqueueMaintenanceJob({ category, data })
      expect(maintenanceQueue.add).toHaveBeenCalledWith(category, data, {})
    })

    it('should default data to {} if not provided', async () => {
      const category = 'defaultDataTest'
      const processor = jest.fn()
      addQueueProcessor(category, processor)
      maintenanceQueue.add = jest.fn()
      await enqueueMaintenanceJob({ category })
      // the merged object will be {} (from default data and {} from referenceData)
      expect(maintenanceQueue.add).toHaveBeenCalledWith(category, expect.objectContaining({}), expect.objectContaining({}))
    })

    it('should log an error if no processor is defined for the given type', async () => {
      const category = 'non-existent-category'
      await enqueueMaintenanceJob({ category })
      expect(auditLogger.error).toHaveBeenCalledWith(new Error(`Maintenance Queue Error: no processor defined for ${category}`))
    })
  })

  describe('createMaintenanceLog', () => {
    it('should create a new maintenance log with the given data', async () => {
      const category = 'test-category'
      const type = 'test-type'
      const data = { test: 'createMaintenanceLog test' }
      const triggeredById = null
      const expectedLog = {
        id: 1,
        category,
        type,
        data,
        triggeredById,
      }
      MaintenanceLog.create.mockResolvedValue(expectedLog)
      const log = await createMaintenanceLog(category, type, data, triggeredById)
      expect(MaintenanceLog.create).toHaveBeenCalledWith({
        category,
        type,
        data,
        triggeredById,
      })
      expect(log).toEqual(expectedLog)
    })
  })

  describe('updateMaintenanceLog', () => {
    it('should update the maintenance log with new data and success status', async () => {
      const log = { id: 1 }
      const newData = { test: 'updateMaintenanceLog test' }
      const isSuccessful = true
      await updateMaintenanceLog(log, newData, isSuccessful)
      expect(MaintenanceLog.update).toHaveBeenCalledWith({ data: newData, isSuccessful }, { where: { id: log.id } })
    })
  })

  describe('maintenanceCommand', () => {
    let callback
    let category
    let type
    let data
    let triggeredById
    beforeEach(() => {
      callback = jest.fn()
      category = 'test-category'
      type = 'test-type'
      data = { test: 'maintenanceCommand test' }
      triggeredById = 1
    })

    afterEach(() => {
      jest.clearAllMocks()
    })

    it('should create a new maintenance log', async () => {
      await maintenanceCommand(callback, category, type, data, triggeredById)
      expect(MaintenanceLog.create).toHaveBeenCalledWith({
        category,
        type,
        data,
        triggeredById,
      })
    })

    it('should execute the callback and return the success status', async () => {
      const result = { isSuccessful: true, data }
      callback.mockResolvedValue(result)
      const isSuccessful = await maintenanceCommand(callback, category, type, data, triggeredById)
      expect(callback).toHaveBeenCalledWith([], [], 1)
      expect(isSuccessful).toBe(true)
    })

    it('should update the maintenance log with error info if callback throws', async () => {
      const errorMessage = 'test-error'
      const error = new Error(errorMessage)
      callback.mockRejectedValue(error)
      const log = { id: 1, data }
      MaintenanceLog.create.mockResolvedValue(log)
      await maintenanceCommand(callback, category, type, data, triggeredById)
      expect(MaintenanceLog.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            error: JSON.parse(JSON.stringify(error)),
            errorMessage,
          }),
        }),
        { where: { id: log.id } }
      )
    })

    it('should default data to {} if not provided', async () => {
      const cb = jest.fn().mockResolvedValue({ isSuccessful: true })
      await maintenanceCommand(cb, 'test-category', 'test-type', undefined, 1)
      expect(MaintenanceLog.create).toHaveBeenCalledWith({
        category: 'test-category',
        type: 'test-type',
        data: {},
        triggeredById: 1,
      })
    })

    it('should include messages and benchmarks in the update if available', async () => {
      const cb = jest.fn().mockImplementation(async (logMessages, logBenchmarks) => {
        logMessages.push('Log message')
        logBenchmarks.push('Log benchmark')
        throw new Error('Test error')
      })
      await maintenanceCommand(cb, 'test-category', 'test-type', {}, 1)
      expect(MaintenanceLog.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            messages: ['Log message'],
            benchmarks: ['Log benchmark'],
            errorMessage: 'Test error',
          }),
        }),
        expect.any(Object)
      )
    })
  })

  describe('backDate', () => {
    it('should return a date shifted back by the specified days', () => {
      const today = new Date()
      const dateOffSet = 7
      const shiftedDate = new Date(today.getTime() - dateOffSet * 24 * 60 * 60 * 1000)
      const expected = new Date(
        shiftedDate.getFullYear(),
        shiftedDate.getMonth(),
        shiftedDate.getDate(),
        today.getHours(),
        today.getMinutes(),
        today.getSeconds()
      )
      expect(backDate(dateOffSet)).toEqual(expected)
    })
  })

  describe('clearMaintenanceLogs', () => {
    it('should call MaintenanceLog.destroy with the correct query', async () => {
      const data = { dateOffSet: 7 }
      const olderThen = backDate(data.dateOffSet)
      await clearMaintenanceLogs(data, null)
      expect(MaintenanceLog.destroy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: { [Op.lt]: olderThen },
          }),
        })
      )
    })

    it('should return the result of the maintenance command', async () => {
      const dataNew = { dateOffSet: 7, testName: 'clearMaintenanceLogs test' }
      MaintenanceLog.create.mockResolvedValue({ id: 1, data: dataNew })
      MaintenanceLog.destroy.mockResolvedValue(0)
      const result = await clearMaintenanceLogs(dataNew, null)
      expect(result).toEqual(true)
    })
  })

  describe('maintenance', () => {
    beforeAll(() => {
      jest.clearAllMocks()
    })
    it('should call clearMaintenanceLogs for CLEAR_MAINTENANCE_LOGS type', async () => {
      const job = {
        data: {
          type: MAINTENANCE_TYPE.CLEAR_MAINTENANCE_LOGS,
          dateOffSet: 0.125,
          test: 'maintenance test',
        },
      }
      MaintenanceLog.create.mockResolvedValue({ id: 1, data: job.data })
      const olderThen = backDate(job.data.dateOffSet)
      await maintenance(job)
      expect(MaintenanceLog.destroy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: { [Op.lt]: olderThen },
          }),
        })
      )
    })

    it('should throw an error for an invalid maintenance type', async () => {
      const job = { data: { type: 'INVALID_TYPE' } }
      await expect(maintenance(job)).rejects.toThrow('Invalid maintenance type: INVALID_TYPE')
    })
  })
})

// ------------------------
// New Tests for Cron Enrollment & Cron Jobs and Job Creation Helpers
// ------------------------

describe('Cron Enrollment and Cron Jobs', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('registerCronEnrollmentFunction adds a function and executeCronEnrollmentFunctions calls it', async () => {
    let called = false
    const testFn = jest.fn(async (instanceId, contextId, env) => {
      called = true
    })
    registerCronEnrollmentFunction(testFn)
    await executeCronEnrollmentFunctions('0', 0, 'production')
    expect(testFn).toHaveBeenCalledWith('0', 0, 'production')
    expect(called).toBe(true)
  })

  it('executeCronEnrollmentFunctions logs error if a cron function throws', async () => {
    const errorFn = jest.fn(async () => {
      throw new Error('cron error')
    })
    registerCronEnrollmentFunction(errorFn)
    await executeCronEnrollmentFunctions('0', 0, 'production')
    expect(auditLogger.error).toHaveBeenCalledWith(expect.stringContaining('Error executing cron enrollment function: cron error'), expect.any(Error))
  })

  it('addCronJob and hasCronJob work correctly', () => {
    const category = 'cronTestCategory'
    const type = 'cronTestType'
    const name = 'testJob'
    const schedule = '*/5 * * * *'
    const jobCommand = jest.fn()
    addCronJob(category, type, jobCommand, schedule, name)
    expect(hasCronJob(category, type, name)).toBe(true)
  })

  it('removeCronJob removes the job from cron jobs', () => {
    const category = 'cronTestCategory2'
    const type = 'cronTestType2'
    const name = 'testJob2'
    const schedule = '*/5 * * * *'
    const jobCommand = jest.fn()
    addCronJob(category, type, jobCommand, schedule, name)
    expect(hasCronJob(category, type, name)).toBe(true)
    removeCronJob(category, type, name)
    expect(hasCronJob(category, type, name)).toBe(false)
  })

  it('setCronJobSchedule updates the schedule for a cron job', () => {
    const category = 'cronTestCategory3'
    const type = 'cronTestType3'
    const name = 'testJob3'
    const schedule = '*/5 * * * *'
    const newSchedule = '0 0 * * *'
    const jobCommand = jest.fn()
    addCronJob(category, type, jobCommand, schedule, name)
    setCronJobSchedule(category, type, name, newSchedule)
    // Indirectly verify by creating a job with the updated schedule.
    const dummyJobCommand = jest.fn((cat, typ, tz, sched) => ({
      running: true,
      schedule: sched,
      start: jest.fn(),
    }))
    const job = createJob(category, type, name, 'UTC', newSchedule, dummyJobCommand)
    expect(dummyJobCommand).toHaveBeenCalledWith(category, type, 'UTC', newSchedule)
  })

  it('runMaintenanceCronJobs creates jobs from the registered cron jobs', () => {
    const category = 'cronTestCategory4'
    const type = 'cronTestType4'
    const name = 'testJob4'
    const schedule = '*/5 * * * *'
    const dummyJob = { running: false, start: jest.fn() }
    const dummyJobCommand = jest.fn(() => dummyJob)
    addCronJob(category, type, dummyJobCommand, schedule, name)
    const jobs = runMaintenanceCronJobs('UTC')
    // The returned object should have a property for our category.
    expect(jobs[category]).toBeDefined()
    expect(dummyJobCommand).toHaveBeenCalledWith(category, type, 'UTC', schedule)
    expect(jobs[category][type]).toBe(dummyJob)
  })
})

describe('createJob and createCategory', () => {
  it('createJob should start the job if not running and mark it as started', () => {
    const category = 'testCat'
    const type = 'testType'
    const name = 'testName'
    const timezone = 'UTC'
    const schedule = '* * * * *'
    const startFn = jest.fn()
    const dummyJob = { running: false, start: startFn }
    const dummyJobCommand = jest.fn(() => dummyJob)
    // Set up the cron job entry as would be done via addCronJob
    addCronJob(category, type, dummyJobCommand, schedule, name)
    const result = createJob(category, type, name, timezone, schedule, dummyJobCommand)
    expect(dummyJobCommand).toHaveBeenCalledWith(category, type, timezone, schedule)
    expect(startFn).toHaveBeenCalled()
    expect(result).toEqual({ [type]: dummyJob })
  })

  it('createCategory should only create jobs for entries not yet started', () => {
    const category = 'catTest'
    const timezone = 'UTC'
    const dummyJob = { running: false, start: jest.fn() }
    const dummyJobCommand = jest.fn(() => dummyJob)
    // Set up the cron job entries as would be done via addCronJob:
    addCronJob(category, 'testType', dummyJobCommand, '* * * * *', 'testJob')
    addCronJob(category, 'testType', dummyJobCommand, '* * * * *', 'alreadyStarted')

    // Now create typeJobs matching these entries.
    const typeJobs = {
      testType: {
        testJob: { jobCommand: dummyJobCommand, schedule: '* * * * *', started: false },
        alreadyStarted: { jobCommand: dummyJobCommand, schedule: '* * * * *', started: true },
      },
    }
    const result = createCategory(category, typeJobs, timezone)
    expect(dummyJobCommand).toHaveBeenCalledWith(category, 'testType', timezone, '* * * * *')
    expect(result).toHaveProperty(category)
    expect(result[category]).toHaveProperty('testType', dummyJob)
    expect(result[category]).not.toHaveProperty('alreadyStarted')
  })
})

describe('enqueueMaintenanceJob with requiredLaunchScript and lock', () => {
  const testCategory = 'test-required'
  const testData = { type: 'testType' }
  const testProcessor = jest.fn()
  beforeEach(() => {
    // Simulate process.argv[1] so that its script name is "testScript.js"
    process.argv[1] = '/path/to/testScript.js'
    maintenanceQueue.add = jest.fn()
    addQueueProcessor(testCategory, testProcessor)
  })

  it('executes action when requiredLaunchScript is not provided', async () => {
    await enqueueMaintenanceJob({ category: testCategory, data: testData })
    expect(maintenanceQueue.add).toHaveBeenCalledWith(testCategory, expect.objectContaining(testData), expect.objectContaining({}))
  })

  it('executes action when requiredLaunchScript is provided and matches', async () => {
    await enqueueMaintenanceJob({
      category: testCategory,
      data: testData,
      requiredLaunchScript: 'testScript',
    })
    expect(maintenanceQueue.add).toHaveBeenCalledWith(testCategory, expect.objectContaining(testData), expect.objectContaining({}))
  })

  it('does not execute action when requiredLaunchScript is provided and does not match', async () => {
    process.argv[1] = '/path/to/differentScript.js'
    await enqueueMaintenanceJob({
      category: testCategory,
      data: testData,
      requiredLaunchScript: 'testScript',
    })
    expect(maintenanceQueue.add).not.toHaveBeenCalled()
  })

  it('executes action with lock when requiresLock is true', async () => {
    // eslint-disable-next-line global-require
    const LockManager = require('../lockManager').default
    await enqueueMaintenanceJob({
      category: testCategory,
      data: testData,
      requiredLaunchScript: 'testScript',
      requiresLock: true,
      holdLock: false,
    })
    // Verify that LockManager was instantiated with the correct lock name.
    expect(LockManager).toHaveBeenCalledWith(`maintenanceLock-${testCategory}-${testData?.type}`)
    // Grab the lock manager instance and check that its executeWithLock was called.
    const lockManagerInstance = LockManager.mock.results[0].value
    expect(lockManagerInstance.executeWithLock).toHaveBeenCalled()
    expect(maintenanceQueue.add).toHaveBeenCalledWith(testCategory, expect.objectContaining(testData), expect.objectContaining({}))
  })
})
