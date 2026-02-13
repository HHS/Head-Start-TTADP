import Queue from 'bull'
import addToScanQueue, { scanQueue, onFailedScanQueue, onCompletedScanQueue, processScanQueue } from './scanQueue'
import { auditLogger, logger } from '../logger'

jest.mock('bull')

describe('addToScanQueue', () => {
  const mockPassword = 'SUPERSECUREPASSWORD'
  const originalEnv = process.env

  beforeAll(() => {
    process.env.REDIS_PASS = mockPassword
  })

  afterAll(() => {
    process.env = originalEnv
  })

  beforeEach(() => {
    scanQueue.add = jest.fn()
    Queue.mockImplementation(() => scanQueue)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('calls scanQueue.add', async () => {
    await addToScanQueue({ key: 'test.txt' })
    expect(scanQueue.add).toHaveBeenCalledWith(
      {
        key: 'test.txt',
        referenceData: {
          impersonationId: '',
          sessionSig: '',
          transactionId: '',
          userId: '',
        },
      },
      expect.objectContaining({
        attempts: expect.any(Number),
        backoff: expect.any(Object),
        removeOnComplete: true,
        removeOnFail: true,
      })
    )
  })

  it('onFailedScanQueue logs an error', () => {
    const job = { data: { key: 'test-key' } }
    const error = new Error('Test error')
    const auditLoggerSpy = jest.spyOn(auditLogger, 'error')
    onFailedScanQueue(job, error)
    expect(auditLoggerSpy).toHaveBeenCalledWith('job test-key failed with error Error: Test error')
  })

  it('onCompletedScanQueue logs info on success', () => {
    const job = { data: { key: 'test-key' } }
    const result = { status: 200, data: { message: 'Success' } }
    const loggerSpy = jest.spyOn(logger, 'info')
    onCompletedScanQueue(job, result)
    expect(loggerSpy).toHaveBeenCalledWith('job test-key completed with status 200 and result {"message":"Success"}')
  })

  it('onCompletedScanQueue logs error on failure', () => {
    const job = { data: { key: 'test-key' } }
    const result = { status: 400, data: { message: 'Failure' } }
    const auditLoggerSpy = jest.spyOn(auditLogger, 'error')
    onCompletedScanQueue(job, result)
    expect(auditLoggerSpy).toHaveBeenCalledWith('job test-key completed with status 400 and result {"message":"Failure"}')
  })

  it('scanQueue on failed event triggers onFailedScanQueue', () => {
    const job = { data: { key: 'test-key' } }
    const error = new Error('Test error')
    const auditLoggerSpy = jest.spyOn(auditLogger, 'error')
    scanQueue.on.mockImplementation((event, callback) => {
      if (event === 'failed') {
        callback(job, error)
      }
    })
    scanQueue.on('failed', onFailedScanQueue)
    expect(auditLoggerSpy).toHaveBeenCalledWith('job test-key failed with error Error: Test error')
  })

  it('scanQueue on completed event triggers onCompletedScanQueue', () => {
    const job = { data: { key: 'test-key' } }
    const result = { status: 200, data: { message: 'Success' } }
    const loggerSpy = jest.spyOn(logger, 'info')
    scanQueue.on.mockImplementation((event, callback) => {
      if (event === 'completed') {
        callback(job, result)
      }
    })
    scanQueue.on('completed', onCompletedScanQueue)
    expect(loggerSpy).toHaveBeenCalledWith('job test-key completed with status 200 and result {"message":"Success"}')
  })

  it('processScanQueue sets up listeners and processes the queue', () => {
    processScanQueue()
    expect(scanQueue.on).toHaveBeenCalledWith('failed', onFailedScanQueue)
    expect(scanQueue.on).toHaveBeenCalledWith('completed', onCompletedScanQueue)
    expect(scanQueue.process).toHaveBeenCalled()
  })
})
