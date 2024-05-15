import { createClient, RedisClientType } from 'redis';
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
  outputCallback: ((response: string) => string) | JSON['parse'] = (response: string) => response,
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

  let redisClient: RedisClientType | null = null;

  try {
    if (!ignoreCache) {
      redisClient = createClient({
        url: redisUrl,
        socket: {
          tls: tlsEnabled,
        },
      });
      await redisClient.connect();
    }
  } catch (err) {
    auditLogger.error('Error creating & connecting to redis client', { err });
    // Using a simpler fallback type that mimics the client without added types for modules/scripts
    redisClient = {
      async connect() {
        return this; // Ensure this dummy implementation returns 'this' for chainability
      },
      async get(_k: string) {
        return null; // Simulate no data found
      },
      async set(_k: string, _v: string, _o: CacheOptions) {
        return 'OK'; // Simulate successful set
      },
      async quit() {
        return 'OK'; // Simulate successful quit
      },
    } as RedisClientType;
  }

  let response: string | null = null;

  if (redisClient) {
    try {
      response = await redisClient.get(key);
      if (!response) {
        response = await responseCallback();
        if (response) {
          await redisClient.set(key, response, options);
        }
      }
    } catch (err) {
      auditLogger.error('Error retrieving or setting cache', { err });
    } finally {
      if (redisClient) {
        await redisClient.quit();
      }
    }
  }

  if (outputCallback) {
    return outputCallback(response);
  }

  return response;
}
