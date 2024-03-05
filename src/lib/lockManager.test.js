import Redis from 'ioredis';
import LockManager from './lockManager';

jest.mock('ioredis', () => jest.requireActual('ioredis-mock'));

describe('LockManager', () => {
  let lockManager;
  const lockKey = 'test-lock';
  const lockTTL = 2000;
  const redisConfig = {
    uri: 'redis://localhost:6379',
    host: 'localhost',
    port: '6379',
    tlsEnabled: false,
  };

  beforeEach(() => {
    lockManager = new LockManager(lockKey, lockTTL, redisConfig);
  });

  afterEach(async () => {
    await lockManager.stopRenewal();
    jest.clearAllMocks();
  });

  describe('acquireLock', () => {
    it('should acquire a lock if it is not already taken', async () => {
      const acquired = await lockManager.acquireLock();
      expect(acquired).toBe(true);
    });

    it('should not acquire a lock if it is already taken', async () => {
      await lockManager.acquireLock();
      const acquiredAgain = await lockManager.acquireLock();
      expect(acquiredAgain).toBe(false);
    });
  });

  describe('releaseLock', () => {
    it('should release a lock', async () => {
      await lockManager.acquireLock();
      await lockManager.releaseLock();
      const lockValue = await lockManager.readLock();
      expect(lockValue).toBeNull();
    });
  });

  describe('executeWithLock', () => {
    it('should execute the callback if the lock is acquired', async () => {
      const callback = jest.fn();
      await lockManager.executeWithLock(callback);
      expect(callback).toHaveBeenCalled();
    });

    it('should not execute the callback if the lock is not acquired', async () => {
      const anotherLockManager = new LockManager(lockKey, lockTTL, redisConfig);
      await anotherLockManager.acquireLock();

      const callback = jest.fn();
      await lockManager.executeWithLock(callback);
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('renewHoldTTL', () => {
    it('should renew the TTL of the lock if it is still held', async () => {
      await lockManager.acquireLock();
      const renewed = await lockManager.renewHoldTTL();
      expect(renewed).toBe(true);
    });

    it('should not renew the TTL if the lock is not held', async () => {
      const renewed = await lockManager.renewHoldTTL();
      expect(renewed).toBe(false);
    });
  });

  describe('startRenewal', () => {
    it('should start the renewal process', async () => {
      jest.useFakeTimers();
      await lockManager.acquireLock();
      await lockManager.startRenewal();

      jest.advanceTimersByTime(lockTTL / 2);
      expect(setInterval).toHaveBeenCalled();
      jest.useRealTimers();
    });
  });

  describe('stopRenewal', () => {
    it('should stop the renewal process', async () => {
      jest.useFakeTimers();
      await lockManager.acquireLock();
      await lockManager.startRenewal();

      await lockManager.stopRenewal();
      expect(clearInterval).toHaveBeenCalled();
      jest.useRealTimers();
    });
  });
});
