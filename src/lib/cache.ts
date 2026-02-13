import { Redis } from 'ioredis';
import { generateRedisConfig } from './queue';
import { auditLogger } from '../logger';

interface CacheOptions {
  EX?: number; // time in seconds
}

/**
 *
 * @param {string} key the key to use for the cache
 * @param {function} responseCallback will be called if the cache is empty (must return a string)
 * @param {function} outputCallback will be called to format the output, defaults to a passthrough
 * @param options see the interface above, defaults to 10 minutes
 * @returns Promise<string | null>, the cached response or null if there was an error
 */
export default async function getCachedResponse(
  key: string,
  responseCallback: () => Promise<string>,
  outputCallback: ((foo: string) => string) | JSON['parse'] = (foo: string) => foo,
  options: CacheOptions = {
    EX: 600,
  },
): Promise<string | null> {
  const {
    uri: redisUrl,
    tlsEnabled,
  } = generateRedisConfig();

  // you can set ignore cache in your .env file to ignore the cache
  // for debugging and testing purposes
  const ignoreCache = process.env.IGNORE_CACHE === 'true';

  if (ignoreCache) {
    auditLogger.info(`Ignoring cache for ${key}`);
  }

  // we create a fake redis client because we don't want to fail the request if redis is down
  // or if we can't connect to it, or whatever else might go wrong
  let redisClient: Redis | null = null;
  let response: string | null = null;

  try {
    if (!ignoreCache) {
      try {
        redisClient = new Redis(redisUrl, {
          tls: tlsEnabled ? { rejectUnauthorized: false } : undefined,
        });
      } catch (err) {
        auditLogger.error('Error creating & connecting to redis client', { err });
      }

      if (redisClient) {
        try {
          response = await redisClient.get(key);
        } catch (err) {
          auditLogger.error('Error getting cache response', { err });
        }
      }
    }

    // if we do not have a response, we need to call the callback
    if (!response) {
      response = await responseCallback();
      // and then, if we have a response and we have a redis client, we need to set the cache
      if (response && redisClient) {
        try {
          await redisClient.set(key, response, 'EX', options.EX || 600);
        } catch (err) {
          auditLogger.error('Error setting cache response', { err });
        }
      }
    }
  } finally {
    if (redisClient) {
      try {
        await redisClient.quit();
      } catch (err) {
        auditLogger.error('Error closing redis client', { err });
        redisClient.disconnect();
      }
    }
  }

  if (outputCallback) {
    return outputCallback(response);
  }

  /* istanbul ignore next: not possible to test */
  return response;
}
