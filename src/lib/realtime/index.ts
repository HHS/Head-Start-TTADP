/**
 * Realtime (websocket) rooms, presence, and broadcasts.
 *
 * Replaces @mesh-kit/core. Each web instance holds its own sockets; Redis
 * pub/sub fans messages out across instances and a Redis hash per room holds
 * presence so every instance sees the same set of users.
 *
 * Protocol (JSON text frames):
 *   client -> server  { type: 'join' | 'leave', room }
 *   server -> client  { type: 'presence', room, version, users: [{ userId, username, tabs }] }
 *                     { type: 'event', room, event, data }
 *                     { type: 'error', room, error: 'forbidden' }
 *
 * Presence snapshots can reach a client out of order when several instances
 * publish at once; `version` increases with every snapshot so clients can
 * ignore stale ones.
 */
import { randomUUID } from 'node:crypto';
import type { IncomingMessage, Server } from 'node:http';
import type { Duplex } from 'node:stream';
import type Redis from 'ioredis';
import { type RawData, WebSocket, WebSocketServer } from 'ws';
import { auditLogger } from '../../logger';
import { getRedis } from '../redisClient';

export const CHANNEL = 'realtime:rooms';
export const ROOM_PATTERN = /^(ar|cr)-\d+$/;
// only activity report rooms track presence (parity with the previous mesh config)
export const PRESENCE_ROOM_PATTERN = /^ar-\d+$/;
export const HEARTBEAT_MS = 15000;
// a presence entry not refreshed within this window belongs to a dead instance
export const PRESENCE_TTL_MS = HEARTBEAT_MS * 3;
const MAX_PAYLOAD_BYTES = 4 * 1024;

export const presenceKey = (room: string) => `realtime:presence:${room}`;
export const presenceVersionKey = (room: string) => `realtime:presence-version:${room}`;

export interface RealtimeUser {
  userId: number;
  username: string;
}

export interface PresenceUser extends RealtimeUser {
  tabs: number;
}

interface PresenceEntry extends RealtimeUser {
  seen: number;
}

interface Client extends RealtimeUser {
  id: string;
  ws: WebSocket;
  rooms: Set<string>;
  isAlive: boolean;
  // join/leave are async; chaining them keeps a client's messages in order
  queue: Promise<void>;
}

type RoomMessage =
  | { type: 'presence'; room: string; version: number; users: PresenceUser[] }
  | { type: 'event'; room: string; event: string; data: unknown };

export type Authenticate = (req: IncomingMessage) => Promise<RealtimeUser | null>;
export type Authorize = (user: RealtimeUser, room: string) => Promise<boolean>;

/**
 * Sends an event to every socket in a room, on every web instance.
 * Safe to call from any process (web or worker) since it only publishes to Redis.
 */
export async function broadcastRoom(
  room: string,
  event: string,
  data: unknown,
  redis: Redis = getRedis()
): Promise<void> {
  const message: RoomMessage = { type: 'event', room, event, data };
  await redis.publish(CHANNEL, JSON.stringify(message));
}

/**
 * Collapses per-connection presence entries into one row per user, dropping
 * entries that have not been refreshed recently. Returns the users and the
 * connection ids that were stale.
 */
export function summarizePresence(
  entries: Record<string, string>,
  now = Date.now()
): { users: PresenceUser[]; stale: string[] } {
  const byUser = new Map<number, PresenceUser>();
  const stale: string[] = [];

  Object.entries(entries).forEach(([connectionId, raw]) => {
    let entry: PresenceEntry;
    try {
      entry = JSON.parse(raw);
    } catch {
      stale.push(connectionId);
      return;
    }
    if (!entry || now - entry.seen > PRESENCE_TTL_MS) {
      stale.push(connectionId);
      return;
    }
    const existing = byUser.get(entry.userId);
    if (existing) {
      existing.tabs += 1;
    } else {
      byUser.set(entry.userId, { userId: entry.userId, username: entry.username, tabs: 1 });
    }
  });

  return { users: [...byUser.values()], stale };
}

export function parseClientMessage(raw: RawData): { type: 'join' | 'leave'; room: string } | null {
  try {
    const message = JSON.parse(raw.toString());
    if (
      message &&
      (message.type === 'join' || message.type === 'leave') &&
      typeof message.room === 'string' &&
      ROOM_PATTERN.test(message.room)
    ) {
      return { type: message.type, room: message.room };
    }
  } catch {
    // fall through
  }
  return null;
}

export function createRealtimeServer({
  server,
  authenticate,
  authorize,
  redis = getRedis(),
  subscriber = getRedis().duplicate({ connectionName: 'app:realtime-sub' }),
  heartbeatMs = HEARTBEAT_MS,
}: {
  server: Server;
  authenticate: Authenticate;
  authorize: Authorize;
  redis?: Redis;
  subscriber?: Redis;
  heartbeatMs?: number;
}) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_PAYLOAD_BYTES });
  const rooms = new Map<string, Set<Client>>();
  // every connected client, whether or not it has joined a room, so heartbeat reaches all of them
  const clients = new Set<Client>();

  const entryFor = (client: Client) =>
    JSON.stringify({ userId: client.userId, username: client.username, seen: Date.now() });

  async function publishPresence(room: string) {
    // read the snapshot and bump the version atomically, so a higher version
    // always means a newer snapshot no matter which instance publishes first
    const [[, entries], [, version]] = (await redis
      .multi()
      .hgetall(presenceKey(room))
      .incr(presenceVersionKey(room))
      .pexpire(presenceVersionKey(room), PRESENCE_TTL_MS * 2)
      .exec()) as [[null, Record<string, string>], [null, number], unknown];
    const { users, stale } = summarizePresence(entries);
    if (stale.length) {
      await redis.hdel(presenceKey(room), ...stale);
    }
    const message: RoomMessage = { type: 'presence', room, version, users };
    await redis.publish(CHANNEL, JSON.stringify(message));
  }

  async function join(client: Client, room: string) {
    if (client.rooms.has(room)) return;

    if (!(await authorize(client, room))) {
      auditLogger.warn(`[realtime] user ${client.userId} denied access to room ${room}`);
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify({ type: 'error', room, error: 'forbidden' }));
      }
      return;
    }
    // the socket may have closed while authorization was pending
    if (client.ws.readyState !== WebSocket.OPEN) return;

    client.rooms.add(room);
    if (!rooms.has(room)) rooms.set(room, new Set());
    rooms.get(room).add(client);

    if (PRESENCE_ROOM_PATTERN.test(room)) {
      await redis
        .multi()
        .hset(presenceKey(room), client.id, entryFor(client))
        .pexpire(presenceKey(room), PRESENCE_TTL_MS * 2)
        .exec();
      await publishPresence(room);
    }
  }

  async function leave(client: Client, room: string) {
    if (!client.rooms.delete(room)) return;
    const members = rooms.get(room);
    members?.delete(client);
    if (members?.size === 0) rooms.delete(room);

    if (PRESENCE_ROOM_PATTERN.test(room)) {
      await redis.hdel(presenceKey(room), client.id);
      await publishPresence(room);
    }
  }

  const logError = (context: string) => (err: unknown) => {
    auditLogger.error(`[realtime] ${context}: ${err}`);
  };

  subscriber.on('message', (channel: string, raw: string) => {
    if (channel !== CHANNEL) return;
    let message: RoomMessage;
    try {
      message = JSON.parse(raw);
    } catch {
      return;
    }
    const members = rooms.get(message.room);
    if (!members) return;
    members.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(raw);
      }
    });
  });
  const subscribed = subscriber.subscribe(CHANNEL);

  wss.on('connection', (ws: WebSocket, user: RealtimeUser) => {
    const client: Client = {
      id: randomUUID(),
      ws,
      userId: user.userId,
      username: user.username,
      rooms: new Set(),
      isAlive: true,
      queue: Promise.resolve(),
    };
    clients.add(client);

    ws.on('pong', () => {
      client.isAlive = true;
    });

    ws.on('message', (raw) => {
      const message = parseClientMessage(raw);
      if (!message) return;
      const action = message.type === 'join' ? join : leave;
      client.queue = client.queue
        .then(() => action(client, message.room))
        .catch(logError(`${message.type} ${message.room}`));
    });

    ws.on('close', () => {
      clients.delete(client);
      client.queue = client.queue.then(async () => {
        await Promise.all(
          [...client.rooms].map((room) =>
            leave(client, room).catch(logError(`leave ${room} on close`))
          )
        );
      });
    });

    ws.on('error', logError('socket error'));
  });

  const onUpgrade = (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    authenticate(req)
      .then((user) => {
        if (!user) {
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }
        wss.handleUpgrade(req, socket, head, (ws) => {
          wss.emit('connection', ws, user);
        });
      })
      .catch((err) => {
        logError('upgrade failed')(err);
        socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
        socket.destroy();
      });
  };
  server.on('upgrade', onUpgrade);

  // Drop dead sockets, and keep this instance's presence entries fresh so other
  // instances don't prune them. Pruning on publish also clears out entries left
  // behind by an instance that crashed.
  const heartbeat = setInterval(() => {
    clients.forEach((client) => {
      if (!client.isAlive) {
        client.ws.terminate();
        return;
      }
      client.isAlive = false;
      client.ws.ping();
    });

    rooms.forEach((members, room) => {
      if (!PRESENCE_ROOM_PATTERN.test(room)) return;
      const pipeline = redis.multi();
      members.forEach((client) => {
        pipeline.hset(presenceKey(room), client.id, entryFor(client));
      });
      pipeline.pexpire(presenceKey(room), PRESENCE_TTL_MS * 2);
      pipeline.pexpire(presenceVersionKey(room), PRESENCE_TTL_MS * 2);
      pipeline
        .exec()
        .then(() => redis.hgetall(presenceKey(room)))
        .then((entries) => {
          if (summarizePresence(entries).stale.length) {
            return publishPresence(room);
          }
          return undefined;
        })
        .catch(logError(`heartbeat ${room}`));
    });
  }, heartbeatMs);
  heartbeat.unref();

  return {
    ready: () => subscribed.then(() => undefined),
    /**
     * Removes this instance's presence entries, closes all sockets, and
     * releases the subscriber connection.
     */
    async close() {
      clearInterval(heartbeat);
      server.off('upgrade', onUpgrade);
      const memberships = [...rooms].flatMap(([room, members]) =>
        [...members].map((client) => [client, room] as const)
      );
      await Promise.allSettled(memberships.map(([client, room]) => leave(client, room)));
      wss.clients.forEach((ws) => {
        ws.close(1001, 'server shutting down');
      });
      wss.close();
      await subscriber.quit();
    },
  };
}
