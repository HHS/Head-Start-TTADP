import express, { Request, Response } from 'express';
import { createClient } from 'redis';
import axios from 'axios';
import transactionWrapper from '../transactionWrapper';
import authMiddleware from '../../middleware/authMiddleware';
import { generateRedisConfig } from '../../lib/queue';

const {
  uri: redisUrl,
  tlsEnabled,
} = generateRedisConfig();

const feedUrl = 'https://acf-ohs.atlassian.net/wiki/createrssfeed.action?types=page&pageSubTypes=comment&spaces=conf_all&title=Confluence+RSS+Feed&labelString=releasenotes&excludedSpaceKeys%3D&sort=modified&maxResults=10&timeSpan=5&showContent=true&confirm=Create+RSS+Feed&os_authType=basic';

const getFeeds = async (_req: Request, res: Response) => {
  const redisClient = createClient({
    url: redisUrl,
    socket: {
      tls: tlsEnabled,
    },
  });

  // connect to redis
  await redisClient.connect();

  // attempt to get the feed from redis
  let feed = await redisClient.get(feedUrl);

  // if the feed is not in redis, fetch it from the url
  if (!feed) {
    const { data } = await axios.get(feedUrl);
    feed = data;

    // set the feed in redis with an expiration of 5 minutes
    await redisClient.set(feedUrl, feed, {
      EX: 300,
    });
  }

  res.send(feed);
};

const router = express.Router();
router.get('/', authMiddleware, transactionWrapper(getFeeds));

export default router;
