/* eslint-disable import/prefer-default-export */
import { Redis } from 'ioredis';
import express, { Response, Request } from 'express';
import { generateRedisConfig } from '../../lib/queue';
import { auditLogger } from '../../logger';
import transactionWrapper from '../transactionWrapper';
import { handleError } from '../../lib/apiErrorHandler';

let redisClient: Redis | null = null;

const namespace = 'ADMIN:REDIS:INFO';
const logContext = { namespace };

/**
   * Gets the redis info from the client, as if you'd run "info"
   * redis cli
   *
   * https://redis.io/commands/info/
   *
   * @param {Request} _req - request
   * @param {Response} res - response
   */
export async function getRedisInfo(req: Request, res: Response) {
  // admin access is already checked in the middleware
  try {
    const { uri: redisUrl, tlsEnabled } = generateRedisConfig();

    redisClient = new Redis(redisUrl, {
      tls: tlsEnabled ? { rejectUnauthorized: false } : undefined,
    });

    await redisClient.connect();
    const info = await redisClient.info();

    await redisClient.quit();
    res.status(200).json({ info });
  } catch (err) {
    await handleError(req, res, err, logContext);
  }
}
/**
 * Runs flush all and then returns info on the redis instance
 * as if you'd run the two commands
 *
 * https://redis.io/commands/flushall/
 * https://redis.io/commands/info/
 *
 * @param {Request} _req - request
 * @param {Response} res - response
 */
export async function flushRedis(req: Request, res: Response) {
  // admin access is already checked in the middleware
  try {
    const { uri: redisUrl, tlsEnabled } = generateRedisConfig();

    redisClient = new Redis(redisUrl, {
      tls: tlsEnabled ? { rejectUnauthorized: false } : undefined,
    });

    await redisClient.connect();
    const flush = await redisClient.flushall();
    auditLogger.info(`Redis cache flushAll with response ${flush}`);

    const info = await redisClient.info();
    await redisClient.quit();
    res.status(200).json({ info });
  } catch (err) {
    await handleError(req, res, err, logContext);
  }
}

const router = express.Router();

router.get('/info', transactionWrapper(getRedisInfo));
router.post('/flush', transactionWrapper(flushRedis));

export default router;
