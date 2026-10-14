/**
 * Realtime (websocket) rooms, presence, and broadcasts.
 *
 * Replaces @mesh-kit/core. Each web instance holds its own sockets; Redis
 * pub/sub fans messages out across instances and a Redis hash per room holds
 * presence so every instance sees the same set of users.
 *
 * Protocol (JSON text frames):
 *   client -> server  { type: 'join', room, tabId? } | { type: 'leave', room }
 *   server -> client  { type: 'presence', room, epoch, version, users: [{ userId, username, tabs }] }
 *                     { type: 'event', room, event, data }
 *                     { type: 'error', room, error: 'forbidden' }
 *
 * Presence snapshots can reach a client out of order when several instances
 * publish at once; `version` increases with every snapshot so clients can
 * ignore stale ones. `epoch` changes if Redis loses the counter, telling
 * clients to start comparing versions over.
 *
 * `tabId` identifies the browser tab, so a reconnect from the same tab is not
 * counted as a second tab while the old connection's entry is still around.
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
export const presenceMetaKey = (room: string) => `realtime:presence-meta:${room}`;
const TAB_ID_PATTERN = /^[A-Za-z0-9-]{1,64}$/;

// Deletes each field only if it still holds the value that was read as stale,
// so an entry another instance refreshed in the meantime survives.
// KEYS[1] = presence hash; ARGV = field1, value1, field2, value2, ...
const DELETE_IF_UNCHANGED = `
local removed = 0
for i = 1, #ARGV, 2 do
  if redis.call('HGET', KEYS[1], ARGV[i]) == ARGV[i + 1] then
    redis.call('HDEL', KEYS[1], ARGV[i])
    removed = removed + 1
  end
end
return removed
`;

export interface RealtimeUser {
  userId: number;
  username: string;
}

export interface PresenceUser extends RealtimeUser {
  tabs: number;
}

interface PresenceEntry extends RealtimeUser {
  seen: number;
  tabId?: string;
}

interface Client extends RealtimeUser {
  id: string;
  tabId: string;
  ws: WebSocket;
  rooms: Set<string>;
  isAlive: boolean;
  // join/leave are async; chaining them keeps a client's messages in order
  queue: Promise<void>;
}

type RoomMessage =
  | { type: 'presence'; room: string; epoch: string; version: number; users: PresenceUser[] }
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
 * Collapses per-connection presence entries into one row per user, counting
 * distinct tabs and dropping entries that have not been refreshed recently.
 * Returns the users and the connection ids that were stale.
 */
export function summarizePresence(
  entries: Record<string, string>,
  now = Date.now()
): { users: PresenceUser[]; stale: string[] } {
  const byUser = new Map<number, { username: string; tabs: Set<string> }>();
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
    if (!byUser.has(entry.userId)) {
      byUser.set(entry.userId, { username: entry.username, tabs: new Set() });
    }
    byUser.get(entry.userId).tabs.add(entry.tabId || connectionId);
  });

  const users = [...byUser].map(([userId, { username, tabs }]) => ({
    userId,
    username,
    tabs: tabs.size,
  }));
  return { users, stale };
}

export function parseClientMessage(
  raw: RawData
): { type: 'join' | 'leave'; room: string; tabId?: string } | null {
  try {
    const message = JSON.parse(raw.toString());
    if (
      message &&
      (message.type === 'join' || message.type === 'leave') &&
      typeof message.room === 'string' &&
      ROOM_PATTERN.test(message.room)
    ) {
      const tabId =
        typeof message.tabId === 'string' && TAB_ID_PATTERN.test(message.tabId)
          ? message.tabId
          : undefined;
      return tabId
        ? { type: message.type, room: message.room, tabId }
        : { type: message.type, room: message.room };
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
    JSON.stringify({
      userId: client.userId,
      username: client.username,
      tabId: client.tabId,
      seen: Date.now(),
    });

  async function publishPresence(room: string) {
    // Read the snapshot and bump the version atomically, so a higher version
    // always means a newer snapshot no matter which instance publishes first.
    // The epoch only changes if Redis lost the meta key.
    const results = await redis
      .multi()
      .hsetnx(presenceMetaKey(room), 'epoch', randomUUID())
      .hincrby(presenceMetaKey(room), 'version', 1)
      .hget(presenceMetaKey(room), 'epoch')
      .pexpire(presenceMetaKey(room), PRESENCE_TTL_MS * 2)
      .hgetall(presenceKey(room))
      .exec();
    const version = Number(results[1][1]);
    const epoch = results[2][1] as string;
    const entries = results[4][1] as Record<string, string>;

    const { users, stale } = summarizePresence(entries);
    const message: RoomMessage = { type: 'presence', room, epoch, version, users };
    await redis.publish(CHANNEL, JSON.stringify(message));

    if (stale.length) {
      const removed = Number(
        await redis.eval(
          DELETE_IF_UNCHANGED,
          1,
          presenceKey(room),
          ...stale.flatMap((id) => [id, entries[id]])
        )
      );
      // an entry we left out was refreshed by its instance after we read it;
      // publish again so clients don't keep a snapshot that is missing it
      if (removed < stale.length) {
        await publishPresence(room);
      }
    }
  }

  async function join(client: Client, room: string, tabId?: string) {
    if (client.rooms.has(room)) return;
    // the tab id is fixed for the life of a connection
    if (tabId && client.tabId === client.id) {
      client.tabId = tabId;
    }

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
    const id = randomUUID();
    const client: Client = {
      id,
      tabId: id,
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
      client.queue = client.queue
        .then(() =>
          message.type === 'join'
            ? join(client, message.room, message.tabId)
            : leave(client, message.room)
        )
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
    // Node removes its own error listener before handing the socket over. Without
    // one, a client resetting the connection while we authenticate is an uncaught
    // exception, which shuts the whole process down.
    const onSocketError = (err: Error) => {
      auditLogger.debug(`[realtime] socket error during upgrade: ${err.message}`);
    };
    socket.on('error', onSocketError);

    const reject = (status: string) => {
      if (socket.destroyed) return;
      socket.write(`HTTP/1.1 ${status}\r\n\r\n`);
      socket.destroy();
    };

    authenticate(req)
      .then((user) => {
        if (socket.destroyed) return;
        if (!user) {
          reject('401 Unauthorized');
          return;
        }
        // ws attaches its own error handling from here on
        socket.off('error', onSocketError);
        wss.handleUpgrade(req, socket, head, (ws) => {
          wss.emit('connection', ws, user);
        });
      })
      .catch((err) => {
        logError('upgrade failed')(err);
        reject('500 Internal Server Error');
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
      pipeline.pexpire(presenceMetaKey(room), PRESENCE_TTL_MS * 2);
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
