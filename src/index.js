require('newrelic');

/* eslint-disable import/first */
import { WebSocketServer } from 'ws';
import { createClient } from 'redis';
import app from './app';
import { auditLogger } from './logger';
import { generateRedisConfig } from './lib/queue';
/* eslint-enable import/first */

const bypassSockets = !!process.env.BYPASS_SOCKETS;

const port = process.env.PORT || 8080;
const server = app.listen(port, () => {
  auditLogger.info(`Listening on port ${port}`);
});

if (!bypassSockets) {
  const {
    uri: redisUrl,
    tlsEnabled,
  } = generateRedisConfig();

  // IIFE to get around top level awaits
  (async () => {
    try {
      const wss = new WebSocketServer({ server });

      const redisClient = createClient({
        url: redisUrl,
        socket: {
          tls: tlsEnabled,
        },
      });
      await redisClient.connect();

      // We need to set up duplicate connections for subscribing,
      // as once a client is in "subscribe" mode, it can't send
      // any other commands (like "publish")
      const subscriber = redisClient.duplicate();
      await subscriber.connect();

      let channelName = '';

      wss.on('connection', async (ws, req) => {
        channelName = req.url;
        await subscriber.subscribe(channelName, (message) => {
          ws.send(message);
        });

        ws.on('message', async (message) => {
          const { channel, ...data } = JSON.parse(message);
          await redisClient.publish(channel, JSON.stringify(data));
        });

        ws.on('close', async () => subscriber.unsubscribe(channelName));
      });
    } catch (err) {
      auditLogger.error(err);
    }
  })();
}

export default server;
