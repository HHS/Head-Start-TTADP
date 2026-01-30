/* istanbul ignore file: tested but not showing as tested for coverage purposes */
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { generateRedisConfig } from './queue';
import { auditLogger } from '../logger';

export default class LockManager {
  private redis: Redis;

  private lockKey: string;

  private lockValue: string;

  private lockTTL: number;

  private renewalInterval?: NodeJS.Timeout;

  private handleShutdown = async (signalOrError: NodeJS.Signals | Error): Promise<void> => {
    if (signalOrError instanceof Error) {
      auditLogger.error(`An error occurred: ${signalOrError}`);
    } else {
      auditLogger.info(`Received signal: ${signalOrError}`);
    }
    await this.close();
    const exitCode = signalOrError instanceof Error ? 1 : 0;
    process.exit(exitCode);
  };

  private registerEventListeners(): void {
    process.on('SIGINT', this.handleShutdown);
    process.on('SIGTERM', this.handleShutdown);
    process.on('uncaughtException', this.handleShutdown);
    process.on(
      'unhandledRejection',
      this.handleShutdown as unknown as (
        reason,
        promise,
      ) => void,
    );
  }

  constructor(
    lockKey: string,
    lockTTL = 2 * 1000,
    redisConfig = generateRedisConfig(),
  ) {
    const config = {
      ...redisConfig?.redisOpts?.redis,
      uri: redisConfig?.uri,
      host: redisConfig?.host,
      port: Number(redisConfig?.port),
      tlsEnabled: redisConfig?.tlsEnabled,
    };
    this.redis = new Redis(config);
    this.lockKey = lockKey;
    this.lockValue = uuidv4();
    this.lockTTL = lockTTL;

    const isMockRedis = this.redis.constructor?.name === 'RedisMock'
      || (this.redis as unknown as { options?: { data?: unknown } })?.options?.data !== undefined;
    const canSetClientName = typeof (this.redis as { client?: unknown }).client === 'function'
      && process.env.NODE_ENV !== 'test'
      && !isMockRedis;

    if (canSetClientName) {
      try {
        this.redis.client('SETNAME', `${process.argv[1]?.split('/')?.slice(-1)[0]?.split('.')?.[0]}-${this.lockKey}-${this.lockValue}-${process.pid}`);
      } catch (err) {
        // In environments where the "client" command is unsupported (e.g., mocks), skip naming.
        auditLogger.warn('LockManager: unable to set Redis client name; continuing without it', { err });
      }
    }

    this.registerEventListeners();
  }

  private unregisterEventListeners(): void {
    process.removeListener('SIGINT', this.handleShutdown);
    process.removeListener('SIGTERM', this.handleShutdown);
    process.removeListener('uncaughtException', this.handleShutdown);
    process.removeListener(
      'unhandledRejection',
      this.handleShutdown as unknown as (
        reason,
        promise,
      ) => void,
    );
  }

  public async close(): Promise<void> {
    try {
      await this.stopRenewal(false);
      await this.redis.disconnect();
    } finally {
      this.unregisterEventListeners();
    }
  }

  private async acquireLock(): Promise<boolean> {
    const result = await this.redis.set(this.lockKey, this.lockValue, 'PX', this.lockTTL, 'NX');
    return result === 'OK';
  }

  private async releaseLock(): Promise<void> {
    await this.redis.del(this.lockKey);
    await this.close();
  }

  private async readLock(): Promise<string | null> {
    try {
      const value = await this.redis.get(this.lockKey);
      return value;
    } catch (error) {
      // Handle error (e.g., log it, throw it, etc.)
      auditLogger.error(`Error getting value at key "${this.lockKey}":`, error);
      throw error; // or return null; depending on how you want to handle the error
    }
  }

  private async isCurrentLock(): Promise<boolean> {
    const currentLockValue = await this.readLock();
    return this.lockValue === currentLockValue;
  }

  public async executeWithLock(callback: () => Promise<void>, holdLock = false): Promise<void> {
    try {
      let hasLock = await this.acquireLock();
      if (!hasLock) {
        hasLock = await this.isCurrentLock();
        if (!hasLock) {
          auditLogger.log(
            'info',
            `(${process.pid}) Lock for key "${this.lockKey}" is already acquired by another instance. Skipping...`,
          );
          await this.close();
          return;
        }
      }

      await this.startRenewal();

      try {
        auditLogger.log('info', 'LockManager.executeWithLock: before callback');
        await callback();
        auditLogger.log('info', 'LockManager.executeWithLock: after callback');
      } finally {
        if (holdLock) {
          await this.startRenewal(this.lockTTL);
        } else {
          await this.stopRenewal();
        }
      }
    } catch (err) {
      if (err.message !== 'Connection is closed.') {
        auditLogger.error(`LockManager.close: ${err.message}`, err);
        // eslint-disable-next-line no-unsafe-finally
        throw err;
      }
    }
  }

  // Method to renew the hold flag's TTL
  public async renewHoldTTL(ttl = this.lockTTL): Promise<boolean> {
    // Use a Lua script to atomically check if the flag is still set to this instance's UUID
    // and, if so, update the TTL.
    const result = await this.redis.eval(
      `if redis.call("get", KEYS[1]) == ARGV[1] then
         return redis.call("pexpire", KEYS[1], ARGV[2])
       else
         return 0
       end`,
      1,
      `${this.lockKey}`,
      this.lockValue,
      ttl,
    );

    return result === 1;
  }

  // Method to start renewing the hold flag's TTL at a regular interval
  public async startRenewal(ttl = this.lockTTL): Promise<void> {
    const halfTTL = Math.floor(ttl / 2);
    await this.stopRenewal(false);
    const callback = async () => {
      try {
        const renewed = await this.renewHoldTTL(ttl);
        if (!renewed) {
          auditLogger.error(`Failed to renew the lock for key "${this.lockKey}". Another instance may take over.`);
          this.stopRenewal();
        }
      } catch (error) {
        auditLogger.error(`An error occurred during renewal: ${error}`);
        await this.stopRenewal();
      }
    };
    await callback();
    this.renewalInterval = setInterval(callback, halfTTL);
  }

  // Method to stop renewing the hold flag's TTL
  public async stopRenewal(releaseLock = true): Promise<void> {
    if (this.renewalInterval) {
      clearInterval(this.renewalInterval);
      this.renewalInterval = undefined;
    }
    if (releaseLock) {
      await this.releaseLock();
    }
  }
}
