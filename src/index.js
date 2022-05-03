require('newrelic');

/* eslint-disable import/first */
import WebSocket from 'ws';
import { createClient } from 'redis';
import app from './app';
import { auditLogger } from './logger';
import { generateRedisConfig } from './lib/queue';
import { socketPublisher, socketSubscriber } from './lib/socket';
/* eslint-enable import/first */

const port = process.env.PORT || 8080;
const server = app.listen(port, () => {
  auditLogger.info(`Listening on port ${port}`);
});

const {
  host: redisHost,
  port: redisPort,
  redisOpts,
} = generateRedisConfig();

// iife to get around top level awaits
(async () => {
  const wss = new WebSocket.Server({ server });
  const redisClient = createClient({
    url: `redis://default:${redisOpts.redis.password}@${redisHost}:${redisPort}`,
  });
  await redisClient.connect();

  const publisher = redisClient.duplicate();
  await publisher.connect();

  const subscriber = redisClient.duplicate();
  await subscriber.connect();

  wss.on('connection', async (ws) => {
    wss.clients.forEach(async (client) => {
      socketSubscriber(client, subscriber);
    });

    ws.on('message', async (message) => {
      wss.clients.forEach(async (client) => {
        if (client.readyState === WebSocket.OPEN) {
          try {
            const parsedMessage = JSON.parse(message);
            const { event } = parsedMessage;
            socketPublisher(event, client, publisher, parsedMessage);
          } catch (err) {
            client.send(JSON.stringify({}));
          }
        }
      });
    });
  });
})();

export default server;
