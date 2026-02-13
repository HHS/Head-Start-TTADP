// src/lib/maintenance/import.test.js

import { CronJob } from 'cron'
import { enqueueImportMaintenanceJob, importDownload, importProcess, importMaintenance } from './import'
import { MAINTENANCE_TYPE, MAINTENANCE_CATEGORY } from '../../constants'
import { enqueueMaintenanceJob, maintenanceCommand } from './common'
import { download as downloadImport, process as processImport, moreToDownload, moreToProcess } from '../importSystem'
import LockManager from '../lockManager'

// --- Updated mocks ---
// Include missing functions from the common module to prevent import errors.
jest.mock('./common', () => ({
  enqueueMaintenanceJob: jest.fn(),
  maintenanceCommand: jest.fn(),
  addQueueProcessor: jest.fn(),
  registerCronEnrollmentFunction: jest.fn(),
}))

jest.mock('../importSystem', () => ({
  download: jest.fn(),
  process: jest.fn(),
  moreToDownload: jest.fn(),
  moreToProcess: jest.fn(),
}))

jest.mock('cron', () => ({
  CronJob: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn(),
  })),
}))

jest.mock('../lockManager')

describe('Import Module', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('enqueueImportMaintenanceJob', () => {
    it('should enqueue a maintenance job with correct category and type when id is provided', async () => {
      const type = MAINTENANCE_TYPE.IMPORT_SCHEDULE
      const id = 123
      await enqueueImportMaintenanceJob({ type, id })
      expect(enqueueMaintenanceJob).toHaveBeenCalledWith({
        category: MAINTENANCE_CATEGORY.IMPORT,
        data: { type, id },
        requiredLaunchScript: undefined,
        requiresLock: false,
        holdLock: false,
        jobSettings: {},
      })
    })

    it('should enqueue a maintenance job with correct category and type when id is not provided', () => {
      const type = MAINTENANCE_TYPE.IMPORT_SCHEDULE
      enqueueImportMaintenanceJob({ type })
      expect(enqueueMaintenanceJob).toHaveBeenCalledWith({
        category: MAINTENANCE_CATEGORY.IMPORT,
        data: { type, id: undefined },
        requiredLaunchScript: undefined,
        requiresLock: false,
        holdLock: false,
        jobSettings: {},
      })
    })
  })

  describe('importDownload', () => {
    it('should return success when download is successful', async () => {
      const id = 123
      downloadImport.mockResolvedValue([{}, {}])
      moreToDownload.mockResolvedValue(true)
      moreToProcess.mockResolvedValue(true)

      await importDownload(id)
      expect(maintenanceCommand).toHaveBeenCalledWith(expect.any(Function), MAINTENANCE_CATEGORY.IMPORT, MAINTENANCE_TYPE.IMPORT_DOWNLOAD, { id })
      const fn = maintenanceCommand.mock.calls[0][0]
      const result = await fn()

      expect(downloadImport).toHaveBeenCalledWith(id)
      expect(moreToDownload).toHaveBeenCalledWith(id)
      expect(moreToProcess).toHaveBeenCalledWith(id)
      // Two calls: one for re-downloading and one for processing.
      expect(enqueueMaintenanceJob).toHaveBeenCalledTimes(2)
      expect(result?.isSuccessful).toBe(true)
    })

    it('should enqueue a processing job if items to process exist', async () => {
      const id = 123
      downloadImport.mockResolvedValue([{}, {}])
      moreToDownload.mockResolvedValue(true)
      moreToProcess.mockResolvedValue(true)

      await importDownload(id)
      const fn = maintenanceCommand.mock.calls[0][0]
      await fn()
      expect(enqueueMaintenanceJob).toHaveBeenCalledWith({
        category: MAINTENANCE_CATEGORY.IMPORT,
        data: { type: MAINTENANCE_TYPE.IMPORT_PROCESS, id },
        requiredLaunchScript: undefined,
        requiresLock: false,
        holdLock: false,
        jobSettings: { timeout: 4500 },
      })
    })

    it('should not enqueue any job if no items to download or process', async () => {
      const id = 123
      downloadImport.mockResolvedValue([{}, {}])
      moreToDownload.mockResolvedValue(false)
      moreToProcess.mockResolvedValue(false)

      await importDownload(id)
      const fn = maintenanceCommand.mock.calls[0][0]
      const result = await fn()

      expect(downloadImport).toHaveBeenCalledWith(id)
      expect(moreToDownload).toHaveBeenCalledWith(id)
      expect(moreToProcess).toHaveBeenCalledWith(id)
      expect(enqueueMaintenanceJob).not.toHaveBeenCalled()
      expect(result?.isSuccessful).toBe(true)
    })

    it('should return failure if download fails', async () => {
      const id = 123
      downloadImport.mockRejectedValue(new Error('Download failed'))
      moreToDownload.mockResolvedValue(true)

      await importDownload(id)
      const fn = maintenanceCommand.mock.calls[0][0]
      const result = await fn()
      expect(result.isSuccessful).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('importProcess', () => {
    it('should return success when processing is successful', async () => {
      const id = 123
      processImport.mockResolvedValue({})
      moreToProcess.mockResolvedValue(false)
      LockManager.mockImplementation(() => ({
        executeWithLock: jest.fn((cb) => cb()),
      }))

      await importProcess(id)
      expect(maintenanceCommand).toHaveBeenCalledWith(expect.any(Function), MAINTENANCE_CATEGORY.IMPORT, MAINTENANCE_TYPE.IMPORT_PROCESS, { id })
      const fn = maintenanceCommand.mock.calls[0][0]
      const result = await fn()
      expect(result?.isSuccessful).toBe(true)
      expect(processImport).toHaveBeenCalledWith(id)
    })

    it('should enqueue a new job if there are more items to process', async () => {
      const id = 123
      processImport.mockResolvedValue({})
      moreToProcess.mockResolvedValue(true)
      LockManager.mockImplementation(() => ({
        executeWithLock: jest.fn((cb) => cb()),
      }))

      await importProcess(id)
      const fn = maintenanceCommand.mock.calls[0][0]
      await fn()
      expect(enqueueMaintenanceJob).toHaveBeenCalledWith({
        category: MAINTENANCE_CATEGORY.IMPORT,
        data: {
          type: MAINTENANCE_TYPE.IMPORT_PROCESS,
          id,
        },
        requiredLaunchScript: undefined,
        requiresLock: false,
        holdLock: false,
        jobSettings: { timeout: 4500 },
      })
    })

    it('should not enqueue a new job if no more items to process', async () => {
      const id = 123
      processImport.mockResolvedValue({})
      moreToProcess.mockResolvedValue(false)

      await importProcess(id)
      const anonymousFunction = maintenanceCommand.mock.calls[0][0]
      await anonymousFunction()

      expect(enqueueMaintenanceJob).not.toHaveBeenCalledWith({
        category: MAINTENANCE_CATEGORY.IMPORT,
        data: {
          type: MAINTENANCE_TYPE.IMPORT_PROCESS,
          id,
        },
        jobSettings: { timeout: 4500 },
      })
    })

    it('should return failure if processing fails', async () => {
      const id = 123
      processImport.mockRejectedValue(new Error('Processing failed'))

      await importProcess(id)
      const fn = maintenanceCommand.mock.calls[0][0]
      const result = await fn()
      expect(result.isSuccessful).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('importMaintenance', () => {
    it('should throw an error for IMPORT_SCHEDULE jobs', async () => {
      // Since your code does not support IMPORT_SCHEDULE, it should throw.
      const job = { data: { type: MAINTENANCE_TYPE.IMPORT_SCHEDULE, id: 123 } }
      await expect(importMaintenance(job)).rejects.toThrow('Unknown type')
    })

    it('should handle IMPORT_DOWNLOAD jobs correctly', async () => {
      const job = { data: { type: MAINTENANCE_TYPE.IMPORT_DOWNLOAD, id: 123 } }
      maintenanceCommand.mockResolvedValue({ isSuccessful: true })
      const result = await importMaintenance(job)
      expect(result?.isSuccessful).toBe(true)
      expect(maintenanceCommand).toHaveBeenCalledWith(expect.any(Function), MAINTENANCE_CATEGORY.IMPORT, MAINTENANCE_TYPE.IMPORT_DOWNLOAD, {
        id: job.data.id,
      })
    })

    it('should handle IMPORT_PROCESS jobs correctly', async () => {
      const job = { data: { type: MAINTENANCE_TYPE.IMPORT_PROCESS, id: 456 } }
      maintenanceCommand.mockResolvedValue({ isSuccessful: true })
      const result = await importMaintenance(job)
      expect(result?.isSuccessful).toBe(true)
      expect(maintenanceCommand).toHaveBeenCalledWith(expect.any(Function), MAINTENANCE_CATEGORY.IMPORT, MAINTENANCE_TYPE.IMPORT_PROCESS, {
        id: job.data.id,
      })
    })

    it('should throw an error for unknown job types', async () => {
      const job = { data: { type: 'UNKNOWN_TYPE', id: 789 } }
      await expect(importMaintenance(job)).rejects.toThrow('Unknown type')
    })
  })
})
