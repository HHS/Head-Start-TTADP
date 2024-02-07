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
// Function to convert various types of messages to a string
function convertMessageToString(message: string | ArrayBuffer | Buffer[]): string {
  if (typeof message === 'string') {
    return message; // Already a string, return as is
  } else if (message instanceof ArrayBuffer) {
    // Convert ArrayBuffer to Buffer then to string
    return Buffer.from(message).toString();
  } else if (Array.isArray(message)) {
    // Concatenate Buffer[] into a single buffer, then convert to string
    return Buffer.concat(message).toString();
  } else {
    // Fallback for unknown types, might need specific handling
    return ''; // Consider how to handle this case
  }
}

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

      wss.on('connection', async (ws, req) => {
        // We need to set up duplicate connections for subscribing,
        // as once a client is in "subscribe" mode, it can't send
        // any other commands (like "publish")
        const subscriber = redisClient.duplicate();
        await subscriber.connect();

        const channelName = req.url;
        // subscribe to the channel, the function is a callback for what to
        // do when a message is received via redis pub/sub
        await subscriber.subscribe(channelName, (message) => {
        // Convert message to string if it's not already
        const messageAsString = convertMessageToString(message);
        ws.send(message);
        });

        // when a message is received via websocket, publish it to redis
        ws.on('message', async (message) => {
          try {
          // Ensure message is in string format before parsing as JSON
          const messageAsString = convertMessageToString(message);
          const { channel, ...data } = JSON.parse(messageAsString);
          await redisClient.publish(channel, JSON.stringify(data));
          } catch (err) {
            auditLogger.error('WEBSOCKET: The following message was unable to be parsed and returned an error: ', message, err);
          }
        });

        // on close, unsubscribe from the channel
        ws.on('close', async () => subscriber.unsubscribe(channelName));
      });
    } catch (err) {
      auditLogger.error(err);
    }
  })();
}

export default server;
