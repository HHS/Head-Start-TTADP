import { createClient } from 'redis';
import { generateRedisConfig } from './queue';
import { auditLogger } from '../logger';

interface CacheOptions {
  EX?: number; // time in seconds
}

/**
 *
 * @param {string} key the key to use for the cache
 * @param {function} callback will be called if the cache is empty (must return a string)
 * @param options see the interface above, defaults to 10 minutes
 * @returns Promise<string | null>, the cached response or null if there was an error
 */
export default async function getCachedResponse(
  key: string,
  callback: () => Promise<string>,
  options: CacheOptions = {
    EX: 600,
  },
): Promise<string | null> {
  const {
    uri: redisUrl,
    tlsEnabled,
  } = generateRedisConfig();

  // we create a fake redis client because we don't want to fail the request if redis is down
  // or if we can't connect to it, or whatever else might go wrong
  let redisClient = {
    connect: () => Promise.resolve(),
    get: (_k: string) => Promise.resolve(null),
    set: (_k: string, _r: string | null, _o: CacheOptions) => Promise.resolve(''),
    quit: () => Promise.resolve(),
  };

  let clientConnected = false;
  let response: string | null = null;

  try {
    redisClient = createClient({
      url: redisUrl,
      socket: {
        tls: tlsEnabled,
      },
    });
    await redisClient.connect();
    response = await redisClient.get(key);
    clientConnected = true;
  } catch (err) {
    auditLogger.error('Error creating redis client', { err });
  }
  if (!response) {
    response = await callback();
  }

  if (response && clientConnected) {
    try {
      await redisClient.set(key, response, options);
      await redisClient.quit();
    } catch (err) {
      auditLogger.error('Error setting cache response', { err });
    }
  }

  return response;
}
