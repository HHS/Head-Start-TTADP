import { createClient } from 'redis';
import { generateRedisConfig } from './queue';
import { auditLogger } from '../logger';

interface CacheOptions {
  EX?: number; // time in seconds
}

interface FakeRedisClientType {
  connect: () => Promise<void>;
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string | null, options: CacheOptions) => Promise<string>;
  quit: () => Promise<void>;
}

/**
 *
 * @param {string} key the key to use for the cache
 * @param {function} reponseCallback will be called if the cache is empty (must return a string)
 * @param {function} outputCallback will be called to format the output, defaults to a passthrough
 * @param options see the interface above, defaults to 10 minutes
 * @returns Promise<string | null>, the cached response or null if there was an error
 */
export default async function getCachedResponse(
  key: string,
  reponseCallback: () => Promise<string>,
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
  let redisClient: FakeRedisClientType = {
    connect: () => Promise.resolve(),
    get: (_k: string) => Promise.resolve(null),
    set: (_k: string, _r: string | null, _o: CacheOptions) => Promise.resolve('OK'),
    quit: () => Promise.resolve(),
  };

  let clientConnected = false;
  let response: string | null = null;
  // Use type assertion to match the expected interface

  try {
    if (!ignoreCache) {
      const actualRedisClient = createClient({
        url: redisUrl,
        socket: {
          tls: tlsEnabled,
        },
      });
      await actualRedisClient.connect();
      
      redisClient = {
        connect: async () => {
          await actualRedisClient.connect();
          // No return value needed, implicitly returns Promise<void>
        },
        get: (k: string) => actualRedisClient.get(k),
        // Adjusted set method to ensure it returns Promise<void>
        set: (k: string, r: string | null, o: CacheOptions) => {
          if (r === null) {
              // Handle the case where 'r' is null if your logic requires
              // For example, you might choose to not set anything in Redis and return a Promise that resolves to a specific string
              return Promise.resolve('Value was null');
          } else {
              // Assuming actualRedisClient.set correctly returns a Promise<string> with 'OK' upon success
              return actualRedisClient.set(k, r, { EX: o.EX });
          }
      },      
        quit: async () => {
          await actualRedisClient.quit();
          // No return value needed, implicitly returns Promise<void>
        },
      }
      
      

      response = await redisClient.get(key);
      clientConnected = true;
    }
  } catch (err) {
    auditLogger.error('Error creating & connecting to redis client', { err });
  }

  // if we do not have a response, we need to call the callback
  if (!response) {
    response = await reponseCallback();
    // and then, if we have a response and we are connected to redis, we need to set the cache
    if (response && clientConnected) {
      try {
        await redisClient.set(key, response, options);
        await redisClient.quit();
      } catch (err) {
        auditLogger.error('Error setting cache response', { err });
      }
    }
  }

  if (outputCallback) {
    return outputCallback(response);
  }

  return response;
}
