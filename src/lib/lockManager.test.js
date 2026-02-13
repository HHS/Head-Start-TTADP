import { auditLogger } from '../logger'
import LockManager from './lockManager'

jest.mock('ioredis', () => jest.requireActual('ioredis-mock'))

describe('LockManager', () => {
  let lockManager
  const lockKey = 'test-lock'
  const lockTTL = 2000
  const redisConfig = {
    uri: 'redis://localhost:6379',
    host: 'localhost',
    port: '6379',
    tlsEnabled: false,
  }
  let mockExit
  let mockAuditLoggerError
  let mockAuditLoggerInfo

  beforeEach(() => {
    lockManager = new LockManager(lockKey, lockTTL, redisConfig)
    mockAuditLoggerError = jest.spyOn(auditLogger, 'error').mockImplementation()
    mockAuditLoggerInfo = jest.spyOn(auditLogger, 'info').mockImplementation()
    mockExit = jest.fn()
    process.exit = mockExit
    jest.spyOn(lockManager, 'close').mockResolvedValue()
  })

  afterEach(async () => {
    await lockManager.stopRenewal()
    jest.clearAllMocks()
  })

  describe('handleShutdown', () => {
    it('should log error and exit with code 1 on error', async () => {
      const testError = new Error('Test error')
      await lockManager.handleShutdown(testError)
      expect(mockAuditLoggerError).toHaveBeenCalledWith(`An error occurred: ${testError}`)
      expect(mockExit).toHaveBeenCalledWith(1)
    })

    it('should log info and exit with code 0 on signal', async () => {
      const testSignal = 'SIGINT'
      await lockManager.handleShutdown(testSignal)
      expect(mockAuditLoggerInfo).toHaveBeenCalledWith(`Received signal: ${testSignal}`)
      expect(mockExit).toHaveBeenCalledWith(0)
    })
  })

  describe('acquireLock', () => {
    it('should acquire a lock if it is not already taken', async () => {
      const acquired = await lockManager.acquireLock()
      expect(acquired).toBe(true)
    })

    it('should not acquire a lock if it is already taken', async () => {
      await lockManager.acquireLock()
      const acquiredAgain = await lockManager.acquireLock()
      expect(acquiredAgain).toBe(false)
    })
  })

  describe('releaseLock', () => {
    it('should release a lock', async () => {
      await lockManager.acquireLock()
      await lockManager.releaseLock()
      const lockValue = await lockManager.readLock()
      expect(lockValue).toBeNull()
    })
  })

  describe('executeWithLock', () => {
    it('should execute the callback if the lock is acquired', async () => {
      const callback = jest.fn()
      await lockManager.executeWithLock(callback)
      expect(callback).toHaveBeenCalled()
    })

    it('should not execute the callback if the lock is not acquired', async () => {
      const anotherLockManager = new LockManager(lockKey, lockTTL, redisConfig)
      await anotherLockManager.acquireLock()

      const callback = jest.fn()
      await lockManager.executeWithLock(callback)
      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('renewHoldTTL', () => {
    it('should renew the TTL of the lock if it is still held', async () => {
      await lockManager.acquireLock()
      const renewed = await lockManager.renewHoldTTL()
      expect(renewed).toBe(true)
    })

    it('should not renew the TTL if the lock is not held', async () => {
      const renewed = await lockManager.renewHoldTTL()
      expect(renewed).toBe(false)
    })
  })

  describe('LockManager renewal process', () => {
    let lockManager2
    const lockKey2 = 'testLock'
    const lockTTL2 = 2000 // 2 seconds for testing

    beforeEach(async () => {
      lockManager2 = new LockManager(lockKey2, lockTTL2)
      jest.spyOn(lockManager2, 'renewHoldTTL').mockImplementation(async () => true)
      jest.spyOn(lockManager2, 'stopRenewal').mockImplementation(async () => {})
    })

    afterEach(async () => {
      lockManager2.close()
      jest.restoreAllMocks()
    })

    it('should log an error and stop renewal if renewing the lock fails', async () => {
      jest.spyOn(lockManager2, 'renewHoldTTL').mockImplementationOnce(async () => false)
      const stopRenewalSpy = jest.spyOn(lockManager2, 'stopRenewal')
      const auditLoggerErrorSpy = jest.spyOn(auditLogger, 'error')

      await lockManager2.startRenewal()
      expect(auditLoggerErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to renew the lock for key "testLock". Another instance may take over.')
      )
      expect(stopRenewalSpy).toHaveBeenCalled()
    })

    it('should log an error and stop renewal on renewal error', async () => {
      const error = new Error('Renewal error')
      jest.spyOn(lockManager2, 'renewHoldTTL').mockImplementationOnce(async () => {
        throw error
      })
      const stopRenewalSpy = jest.spyOn(lockManager2, 'stopRenewal')
      const auditLoggerErrorSpy = jest.spyOn(auditLogger, 'error')

      await lockManager2.startRenewal()
      expect(auditLoggerErrorSpy).toHaveBeenCalledWith(expect.stringContaining('An error occurred during renewal:'))
      expect(stopRenewalSpy).toHaveBeenCalled()
    })
  })

  describe('stopRenewal', () => {
    it('should stop the renewal process', async () => {
      jest.useFakeTimers()
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval')

      await lockManager.acquireLock()
      await lockManager.startRenewal()

      await lockManager.stopRenewal()
      expect(clearIntervalSpy).toHaveBeenCalled()
      clearIntervalSpy.mockRestore()
      jest.useRealTimers()
    })
  })

  describe('readLock error handling', () => {
    it('should log error and rethrow when getting lock value fails', async () => {
      jest.spyOn(lockManager.redis, 'get').mockRejectedValue(new Error('Redis error'))
      await expect(lockManager.readLock()).rejects.toThrow('Redis error')
      expect(mockAuditLoggerError).toHaveBeenCalledWith(expect.stringContaining('Error getting value at key'), expect.any(Error))
    })
  })

  describe('executeWithLock with holdLock', () => {
    it('should start renewal with the lock TTL when holdLock is true', async () => {
      const callback = jest.fn().mockResolvedValue(0)
      const spyStartRenewal = jest.spyOn(lockManager, 'startRenewal')
      await lockManager.acquireLock()
      await lockManager.executeWithLock(callback, true)
      expect(spyStartRenewal).toHaveBeenCalledWith(lockTTL)
    })
  })

  describe('close method error handling', () => {
    it('should not log or rethrow if error message is "Connection is closed."', async () => {
      const testError = new Error('Connection is closed.')
      jest.spyOn(lockManager.redis, 'disconnect').mockRejectedValue(testError)
      await lockManager.close() // Expect not to throw
      expect(mockAuditLoggerError).not.toHaveBeenCalledWith(`LockManager.close: ${testError.message}`, testError)
    })
  })
})
