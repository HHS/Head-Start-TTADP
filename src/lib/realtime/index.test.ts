import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import RedisMock from 'ioredis-mock';
import { WebSocket } from 'ws';
import {
  broadcastRoom,
  createRealtimeServer,
  PRESENCE_TTL_MS,
  parseClientMessage,
  presenceKey,
  type RealtimeUser,
  summarizePresence,
} from '.';

jest.mock('../redisClient', () => ({ getRedis: jest.fn() }));

const USERS: Record<string, RealtimeUser> = {
  alice: { userId: 1, username: 'Alice' },
  bob: { userId: 2, username: 'Bob' },
};

type Message = { type: string; room: string; users?: unknown[]; event?: string; data?: unknown };

/** Collects every message a socket receives so tests can wait for a specific one. */
function openClient(url: string, user?: string) {
  const ws = new WebSocket(url, { headers: user ? { 'x-test-user': user } : {} });
  // a rejected handshake emits 'error' as well as 'unexpected-response'
  ws.on('error', () => {});
  const received: Message[] = [];
  const waiters: { match: (m: Message) => boolean; resolve: (m: Message) => void }[] = [];

  ws.on('message', (raw) => {
    const message = JSON.parse(raw.toString());
    received.push(message);
    waiters
      .filter((w) => w.match(message))
      .forEach((w) => {
        w.resolve(message);
      });
  });

  return {
    ws,
    received,
    opened: new Promise<void>((resolve, reject) => {
      ws.once('open', () => resolve());
      ws.once('unexpected-response', (_req, res) => reject(new Error(`${res.statusCode}`)));
    }),
    next(match: (m: Message) => boolean) {
      const found = received.find(match);
      if (found) return Promise.resolve(found);
      return new Promise<Message>((resolve) => {
        waiters.push({ match, resolve });
      });
    },
    send(message: object) {
      ws.send(JSON.stringify(message));
    },
  };
}

const presenceWith = (count: number) => (m: Message) =>
  m.type === 'presence' && m.users.length === count;

describe('realtime', () => {
  describe('summarizePresence', () => {
    it('groups connections by user and counts tabs', () => {
      const now = Date.now();
      const { users, stale } = summarizePresence(
        {
          a: JSON.stringify({ userId: 1, username: 'Alice', seen: now }),
          b: JSON.stringify({ userId: 1, username: 'Alice', seen: now }),
          c: JSON.stringify({ userId: 2, username: 'Bob', seen: now }),
        },
        now
      );

      expect(stale).toEqual([]);
      expect(users).toEqual([
        { userId: 1, username: 'Alice', tabs: 2 },
        { userId: 2, username: 'Bob', tabs: 1 },
      ]);
    });

    it('drops entries that were not refreshed in time or cannot be parsed', () => {
      const now = Date.now();
      const { users, stale } = summarizePresence(
        {
          fresh: JSON.stringify({ userId: 1, username: 'Alice', seen: now }),
          old: JSON.stringify({ userId: 2, username: 'Bob', seen: now - PRESENCE_TTL_MS - 1 }),
          junk: 'not json',
        },
        now
      );

      expect(users).toEqual([{ userId: 1, username: 'Alice', tabs: 1 }]);
      expect(stale.sort()).toEqual(['junk', 'old']);
    });
  });

  describe('parseClientMessage', () => {
    it.each([
      ['{"type":"join","room":"ar-1"}', { type: 'join', room: 'ar-1' }],
      ['{"type":"leave","room":"cr-22"}', { type: 'leave', room: 'cr-22' }],
      ['{"type":"join","room":"ar-abc"}', null],
      ['{"type":"join","room":"other-1"}', null],
      ['{"type":"publish","room":"ar-1"}', null],
      ['{"type":"join"}', null],
      ['not json', null],
    ])('parses %s', (raw, expected) => {
      expect(parseClientMessage(Buffer.from(raw))).toEqual(expected);
    });
  });

  describe('server', () => {
    let server: Server;
    let url: string;
    let redis: InstanceType<typeof RedisMock>;
    let realtime: ReturnType<typeof createRealtimeServer>;
    const clients: ReturnType<typeof openClient>[] = [];

    const connect = async (user?: string) => {
      const client = openClient(url, user);
      clients.push(client);
      await client.opened;
      return client;
    };

    beforeEach(async () => {
      redis = new RedisMock();
      await redis.flushall();
      server = createServer();
      realtime = createRealtimeServer({
        server,
        authenticate: async (req) => USERS[req.headers['x-test-user'] as string] || null,
        redis,
        subscriber: redis.duplicate(),
      });
      await realtime.ready();
      await new Promise<void>((resolve) => {
        server.listen(0, resolve);
      });
      url = `ws://localhost:${(server.address() as AddressInfo).port}`;
    });

    afterEach(async () => {
      clients.splice(0).forEach((c) => {
        c.ws.terminate();
      });
      await realtime.close();
      await new Promise((resolve) => {
        server.close(resolve);
      });
      redis.disconnect();
    });

    it('rejects connections without an authenticated user', async () => {
      await expect(connect()).rejects.toThrow('401');
    });

    it('reports presence to everyone in the room as users join and leave', async () => {
      const alice = await connect('alice');
      alice.send({ type: 'join', room: 'ar-5' });
      await alice.next(presenceWith(1));

      const bob = await connect('bob');
      bob.send({ type: 'join', room: 'ar-5' });

      const bothForAlice = await alice.next(presenceWith(2));
      expect(bothForAlice.users).toEqual(
        expect.arrayContaining([
          { userId: 1, username: 'Alice', tabs: 1 },
          { userId: 2, username: 'Bob', tabs: 1 },
        ])
      );
      await bob.next(presenceWith(2));

      const aliceSecondTab = await connect('alice');
      aliceSecondTab.send({ type: 'join', room: 'ar-5' });
      const withTabs = await bob.next(
        (m) =>
          m.type === 'presence' &&
          m.users.some((u: { userId: number; tabs: number }) => u.userId === 1 && u.tabs === 2)
      );
      expect(withTabs.room).toBe('ar-5');

      bob.ws.close();
      const afterBobLeft = await alice.next(
        (m) =>
          m.type === 'presence' &&
          m.users.length === 1 &&
          (m.users[0] as { tabs: number }).tabs === 2
      );
      expect(afterBobLeft.users).toEqual([{ userId: 1, username: 'Alice', tabs: 2 }]);
      expect(Object.keys(await redis.hgetall(presenceKey('ar-5')))).toHaveLength(2);
    });

    it('does not leak presence or events across rooms', async () => {
      const alice = await connect('alice');
      const bob = await connect('bob');
      alice.send({ type: 'join', room: 'ar-1' });
      bob.send({ type: 'join', room: 'ar-2' });
      await alice.next(presenceWith(1));
      await bob.next(presenceWith(1));

      await broadcastRoom('ar-2', 'revision-updated', { reportId: 2 }, redis);
      await bob.next((m) => m.type === 'event');

      expect(alice.received.every((m) => m.room === 'ar-1')).toBe(true);
    });

    it('delivers broadcast events to room members', async () => {
      const alice = await connect('alice');
      alice.send({ type: 'join', room: 'ar-9' });
      await alice.next(presenceWith(1));

      await broadcastRoom('ar-9', 'revision-updated', { reportId: 9, revision: 3 }, redis);

      expect(await alice.next((m) => m.type === 'event')).toEqual({
        type: 'event',
        room: 'ar-9',
        event: 'revision-updated',
        data: { reportId: 9, revision: 3 },
      });
    });

    it('lets collaboration report rooms receive events without tracking presence', async () => {
      const alice = await connect('alice');
      alice.send({ type: 'join', room: 'cr-3' });
      // join is processed in order with later messages, so wait on the broadcast itself
      await new Promise((resolve) => {
        setTimeout(resolve, 50);
      });
      await broadcastRoom('cr-3', 'something', { ok: true }, redis);

      await alice.next((m) => m.type === 'event');
      expect(alice.received.some((m) => m.type === 'presence')).toBe(false);
      expect(await redis.exists(presenceKey('cr-3'))).toBe(0);
    });

    it('clears its presence entries when closed', async () => {
      const alice = await connect('alice');
      alice.send({ type: 'join', room: 'ar-7' });
      await alice.next(presenceWith(1));

      await realtime.close();

      expect(await redis.hgetall(presenceKey('ar-7'))).toEqual({});
      // afterEach closes again; make that a no-op-safe second close
      realtime = { ready: async () => {}, close: async () => {} };
    });
  });
});
