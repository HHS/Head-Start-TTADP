/* eslint-disable import/first */
if (process.env.NODE_ENV === 'production') {
  // eslint-disable-next-line global-require
  require('newrelic');
}

// @ts-expect-error
import { MeshServer } from '@mesh-kit/core/server';
import logger from './__mocks__/logger';
import app from './app';
import { generateRedisConfig } from './lib/queue';
import { auditLogger } from './logger';

const bypassSockets = !!process.env.BYPASS_SOCKETS;
Error.stackTraceLimit = 50;

const port = process.env.PORT || 8080;
const server = app.listen(port, () => {
  auditLogger.info(`Listening on port ${port}`);
});

let meshServerInstance: MeshServer | null = null;

if (!bypassSockets) {
  const { uri: redisUrl, tlsEnabled, redisOpts } = generateRedisConfig();

  const mesh = new MeshServer({
    server,
    redisOptions: {
      host: redisUrl ? new URL(redisUrl).hostname : 'localhost',
      port: redisUrl ? parseInt(new URL(redisUrl).port, 10) || 6379 : 6379,
      password: redisUrl ? redisOpts?.redis?.password || undefined : undefined,
      tls: tlsEnabled ? { rejectUnauthorized: false } : undefined,
    },
  });

  meshServerInstance = mesh;

  mesh
    .ready()
    .then(() => {
      // allow mesh to track presence for rooms that are prefixed with 'ar-'
      mesh.trackPresence(/^ar-.*$/);

      process.on('SIGINT', async () => {
        // disconnects any active connections, cleans up redis, and then closes the server
        await mesh.close();

        process.exit(0);
      });
    })
    .catch((err: unknown) => {
      auditLogger.alertError('Failed to initialize Mesh server:', 'startup_mesh_init_failure', err);
    });
}

/**
 * Returns the mesh server instance if it exists
 * @returns The mesh server instance or null if it doesn't exist
 */
export function getMeshServer(): MeshServer | null {
  return meshServerInstance;
}

export default server;
