import { createClient } from 'redis';
import { generateRedisConfig } from './queue';
import { auditLogger } from '../logger';

interface CacheOptions {
  EX?: number;
}

const {
  uri: redisUrl,
  tlsEnabled,
} = generateRedisConfig();

const redisClient = createClient({
  url: redisUrl,
  socket: {
    tls: tlsEnabled,
  },
});

export default async function getCachedResponse(
  key: string,
  callback: () => Promise<string>,
  options: CacheOptions = {
    EX: 600,
  },
) {
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
      redisClient.set(key, response, options);
    } catch (err) {
      auditLogger.error('Error setting cache response', { err });
    }
  }

  await redisClient.quit();
  return response;
}
