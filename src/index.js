require('newrelic');

/* eslint-disable import/first */
import WebSocket from 'ws';
import app from './app';
import { auditLogger } from './logger';
/* eslint-enable import/first */

const port = process.env.PORT || 8080;
const server = app.listen(port, () => {
  auditLogger.info(`Listening on port ${port}`);
});

// const connections = {};
const wss = new WebSocket.Server({ server });
wss.on('connection', async (ws) => {
  ws.on('message', async (message) => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          const parsedMessage = JSON.parse(message);
          client.send(JSON.stringify(parsedMessage));
        } catch (err) {
          client.send(JSON.stringify({}));
        }
      }
    });
  });
});

export default server;
