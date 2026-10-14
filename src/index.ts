/* eslint-disable import/first */
if (process.env.NODE_ENV === 'production') {
  // eslint-disable-next-line global-require
  require('newrelic');
}

import app from './app';
import { createRealtimeServer } from './lib/realtime';
import authenticateUpgrade from './lib/realtime/authenticateUpgrade';
import authorizeRoom from './lib/realtime/authorizeRoom';
import { auditLogger } from './logger';

const bypassSockets = !!process.env.BYPASS_SOCKETS;
Error.stackTraceLimit = 50;

const port = process.env.PORT || 8080;
const server = app.listen(port, () => {
  auditLogger.info(`Listening on port ${port}`);
});

if (!bypassSockets) {
  const realtime = createRealtimeServer({
    server,
    authenticate: authenticateUpgrade,
    authorize: authorizeRoom,
  });

  realtime
    .ready()
    .then(() => {
      process.on('SIGINT', async () => {
        // removes this instance's presence entries, closes sockets, and releases redis
        await realtime.close();

        process.exit(0);
      });
    })
    .catch((err: unknown) => {
      auditLogger.alertError(
        'Failed to initialize realtime server:',
        'startup_realtime_init_failure',
        err
      );
    });
}

export default server;
