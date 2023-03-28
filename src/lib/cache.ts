import { createClient } from 'redis';
import { generateRedisConfig } from './queue';

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
  let response = await redisClient.get(key);

  if (!response) {
    response = await callback();
    redisClient.set(key, response, options);
  }

  return response;
}
