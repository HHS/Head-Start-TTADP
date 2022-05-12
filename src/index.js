require('newrelic');

/* eslint-disable import/first */
import { WebSocketServer } from 'ws';
import { createClient } from 'redis';
import app from './app';
import { auditLogger } from './logger';
import { generateRedisConfig } from './lib/queue';
/* eslint-enable import/first */

const bypassSockets = !!process.env.BYPASS_SOCKETS;

auditLogger.info(`Are we bypassing websockets? ${bypassSockets ? 'YES' : 'NO'}`);
const port = process.env.PORT || 8080;
const server = app.listen(port, () => {
  auditLogger.info(`Listening on port ${port}`);
});

if (!bypassSockets) {
  auditLogger.info(`BYPASS SOCKETS: ${bypassSockets ? 'YES' : 'NO'}`);
  const {
    host: redisHost,
    port: redisPort,
    redisOpts,
  } = generateRedisConfig();

  // IIFE to get around top level awaits
  (async () => {
    const wss = new WebSocketServer({ server });
    const redisClient = createClient({
      url: `redis://:${redisOpts.redis.password}@${redisHost}:${redisPort}`,
    });
    await redisClient.connect();
    auditLogger.info('connected to redis...');

    // We need to set up duplicate connections for subscribing,
    // as once a client is in "subscribe" mode, it can't send
    // any other commands (like "publish")
    const subscriber = redisClient.duplicate();
    await subscriber.connect();

    let channelName = '';

    wss.on('connection', async (ws, req) => {
      channelName = req.url;
      auditLogger.info(`Connected to websockets. Attempting to connect to redis ${channelName}`);
      await subscriber.subscribe(channelName, (message) => {
        auditLogger.info(`Channel ${channelName} has received a message`);
        ws.send(message);
      });

      ws.on('message', async (message) => {
        const { channel, ...data } = JSON.parse(message);
        auditLogger.info(`Received message, attempting to publish to ${channel}`);
        await redisClient.publish(channel, JSON.stringify(data));
      });
    });

    wss.on('close', async () => subscriber.unsubscribe(channelName));
  })();
}

export default server;
