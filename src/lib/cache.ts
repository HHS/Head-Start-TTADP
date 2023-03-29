import { createClient } from 'redis';
import { generateRedisConfig } from './queue';
import { auditLogger } from '../logger';

interface CacheOptions {
  EX?: number; // time in seconds
}

export default async function getCachedResponse(
  key: string,
  callback: () => Promise<string>,
  options: CacheOptions = {
    EX: 600,
  },
) {
  const {
    uri: redisUrl,
    tlsEnabled,
  } = generateRedisConfig();

  let redisClient = {
    connect: () => Promise.resolve(),
    get: (_k: string) => Promise.resolve(null),
    set: (_k: string, _r: string | null, _o: CacheOptions) => Promise.resolve(''),
    quit: () => Promise.resolve(),
  };

  if (!process.env.CI || process.env.CI === 'false') {
    redisClient = createClient({
      url: redisUrl,
      socket: {
        tls: tlsEnabled,
      },
    });
  }

  let response: string | null = null;
  await redisClient.connect();

  try {
    response = await redisClient.get(key);
  } catch (err) {
    auditLogger.error('Error getting cache response', { err });
  }

  if (!response) {
    response = await callback();
  }

  if (response) {
    try {
      await redisClient.set(key, response, options);
    } catch (err) {
      auditLogger.error('Error setting cache response', { err });
    }
  }

  await redisClient.quit();
  return response;
}
