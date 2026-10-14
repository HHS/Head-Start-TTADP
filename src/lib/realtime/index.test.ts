import { createServer, type IncomingMessage, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { PassThrough } from 'node:stream';
import RedisMock from 'ioredis-mock';
import { WebSocket } from 'ws';
import {
  broadcastRoom,
  createRealtimeServer,
  PRESENCE_TTL_MS,
  parseClientMessage,
  presenceKey,
  presenceMetaKey,
  type RealtimeUser,
  summarizePresence,
} from '.';

jest.mock('../redisClient', () => ({ getRedis: jest.fn() }));

const USERS: Record<string, RealtimeUser> = {
  alice: { userId: 1, username: 'Alice' },
  bob: { userId: 2, username: 'Bob' },
};

type Message = {
  type: string;
  room: string;
  epoch?: string;
  version?: number;
  users?: unknown[];
  event?: string;
  data?: unknown;
  error?: string;
};

/** Collects every message a socket receives so tests can wait for a specific one. */
function openClient(url: string, user?: string, { autoPong = true } = {}) {
  const ws = new WebSocket(url, { headers: user ? { 'x-test-user': user } : {}, autoPong });
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

    it('counts a reconnected tab once while its old connection lingers', () => {
      const now = Date.now();
      const { users } = summarizePresence(
        {
          oldConnection: JSON.stringify({ userId: 1, username: 'Alice', tabId: 't1', seen: now }),
          newConnection: JSON.stringify({ userId: 1, username: 'Alice', tabId: 't1', seen: now }),
          otherTab: JSON.stringify({ userId: 1, username: 'Alice', tabId: 't2', seen: now }),
        },
        now
      );

      expect(users).toEqual([{ userId: 1, username: 'Alice', tabs: 2 }]);
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
      [
        '{"type":"join","room":"ar-1","tabId":"tab-1"}',
        { type: 'join', room: 'ar-1', tabId: 'tab-1' },
      ],
      ['{"type":"join","room":"ar-1","tabId":"<bad>"}', { type: 'join', room: 'ar-1' }],
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
    const authorize = jest.fn();
    const authenticate = jest.fn();
    const HEARTBEAT_TEST_MS = 50;

    const connect = async (user?: string, options?: { autoPong?: boolean }) => {
      const client = openClient(url, user, options);
      clients.push(client);
      await client.opened;
      return client;
    };

    beforeEach(async () => {
      redis = new RedisMock();
      await redis.flushall();
      authorize.mockReset();
      authorize.mockResolvedValue(true);
      authenticate.mockReset();
      authenticate.mockImplementation(
        async (req: IncomingMessage) => USERS[req.headers['x-test-user'] as string] || null
      );
      server = createServer();
      realtime = createRealtimeServer({
        server,
        authenticate,
        authorize,
        redis,
        subscriber: redis.duplicate(),
        heartbeatMs: HEARTBEAT_TEST_MS,
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

    it('survives a client resetting the connection while authentication is pending', async () => {
      let finishAuth: (user: RealtimeUser) => void;
      authenticate.mockImplementation(
        () =>
          new Promise((resolve) => {
            finishAuth = resolve;
          })
      );
      const socket = new PassThrough();
      const req = { headers: {}, url: '/' } as IncomingMessage;

      server.emit('upgrade', req, socket, Buffer.alloc(0));
      // with no listener, emitting 'error' throws, as an uncaught ECONNRESET would
      expect(() => socket.emit('error', new Error('read ECONNRESET'))).not.toThrow();
      socket.destroy();
      finishAuth(USERS.alice);
      await new Promise((resolve) => {
        setImmediate(resolve);
      });

      expect(socket.destroyed).toBe(true);
    });

    it('refuses joins the user is not authorized for', async () => {
      authorize.mockImplementation(async (_user, room) => room !== 'ar-8');
      const alice = await connect('alice');
      alice.send({ type: 'join', room: 'ar-8' });

      expect(await alice.next((m) => m.type === 'error')).toEqual({
        type: 'error',
        room: 'ar-8',
        error: 'forbidden',
      });
      expect(authorize).toHaveBeenCalledWith(expect.objectContaining({ userId: 1 }), 'ar-8');
      expect(await redis.exists(presenceKey('ar-8'))).toBe(0);

      await broadcastRoom('ar-8', 'revision-updated', { reportId: 8 }, redis);
      alice.send({ type: 'join', room: 'ar-9' });
      await alice.next(presenceWith(1));
      expect(alice.received.some((m) => m.type === 'event')).toBe(false);
    });

    it('processes a join and a following leave in order', async () => {
      let allow: (value: boolean) => void;
      authorize.mockImplementation(
        () =>
          new Promise<boolean>((resolve) => {
            allow = resolve;
          })
      );
      const alice = await connect('alice');
      alice.send({ type: 'join', room: 'ar-4' });
      alice.send({ type: 'leave', room: 'ar-4' });
      await new Promise((resolve) => {
        setTimeout(resolve, 20);
      });
      allow(true);

      // the join completes first; the leave then removes the entry it added
      await new Promise((resolve) => {
        setTimeout(resolve, 50);
      });
      expect(await redis.hgetall(presenceKey('ar-4'))).toEqual({});
      await broadcastRoom('ar-4', 'revision-updated', {}, redis);
      await new Promise((resolve) => {
        setTimeout(resolve, 20);
      });
      expect(alice.received.some((m) => m.type === 'event')).toBe(false);
    });

    it('numbers presence snapshots so clients can drop stale ones', async () => {
      const alice = await connect('alice');
      alice.send({ type: 'join', room: 'ar-5' });
      const first = await alice.next(presenceWith(1));

      const bob = await connect('bob');
      bob.send({ type: 'join', room: 'ar-5' });
      const second = await alice.next(presenceWith(2));

      expect(second.version).toBeGreaterThan(first.version);
      expect(second.epoch).toBe(first.epoch);
    });

    it('starts a new epoch if Redis loses the version counter', async () => {
      const alice = await connect('alice');
      alice.send({ type: 'join', room: 'ar-5' });
      const first = await alice.next(presenceWith(1));

      await redis.del(presenceMetaKey('ar-5'));
      const bob = await connect('bob');
      bob.send({ type: 'join', room: 'ar-5' });
      const afterReset = await alice.next(presenceWith(2));

      expect(afterReset.version).toBe(1);
      expect(afterReset.epoch).not.toBe(first.epoch);
    });

    it('counts a reconnect from the same tab as one tab', async () => {
      const first = await connect('alice');
      first.send({ type: 'join', room: 'ar-6', tabId: 'tab-a' });
      await first.next(presenceWith(1));

      // the old connection is still registered when the tab reconnects
      const reconnected = await connect('alice');
      reconnected.send({ type: 'join', room: 'ar-6', tabId: 'tab-a' });
      const update = await first.next(
        (m) => m.type === 'presence' && m.version > 1 && m.users.length === 1
      );

      expect(update.users).toEqual([{ userId: 1, username: 'Alice', tabs: 1 }]);
      expect(Object.keys(await redis.hgetall(presenceKey('ar-6')))).toHaveLength(2);
    });

    it('keeps a stale entry that its instance refreshes before cleanup, and republishes', async () => {
      const ghost = JSON.stringify({
        userId: 2,
        username: 'Bob',
        tabId: 'bob-tab',
        seen: Date.now() - PRESENCE_TTL_MS - 1000,
      });
      await redis.hset(presenceKey('ar-3'), 'bob-connection', ghost);

      // another instance refreshes Bob's entry between our snapshot and the cleanup
      const realEval = redis.eval.bind(redis);
      jest.spyOn(redis, 'eval').mockImplementationOnce(async (...args: unknown[]) => {
        await redis.hset(
          presenceKey('ar-3'),
          'bob-connection',
          JSON.stringify({ userId: 2, username: 'Bob', tabId: 'bob-tab', seen: Date.now() })
        );
        return realEval(...(args as Parameters<typeof realEval>));
      });

      const alice = await connect('alice');
      alice.send({ type: 'join', room: 'ar-3' });

      const repaired = await alice.next(presenceWith(2));
      expect(repaired.users).toEqual(
        expect.arrayContaining([expect.objectContaining({ userId: 2, tabs: 1 })])
      );
      expect(await redis.hget(presenceKey('ar-3'), 'bob-connection')).not.toBe(ghost);
    });

    it('removes stale entries that nobody refreshed', async () => {
      await redis.hset(
        presenceKey('ar-2'),
        'dead-connection',
        JSON.stringify({ userId: 2, username: 'Bob', seen: Date.now() - PRESENCE_TTL_MS - 1000 })
      );

      const alice = await connect('alice');
      alice.send({ type: 'join', room: 'ar-2' });
      await alice.next(presenceWith(1));
      await new Promise((resolve) => {
        setTimeout(resolve, 20);
      });

      expect(await redis.hexists(presenceKey('ar-2'), 'dead-connection')).toBe(0);
    });

    it('drops sockets that stop answering pings, even before joining a room', async () => {
      const silent = await connect('alice', { autoPong: false });
      const closed = new Promise((resolve) => {
        silent.ws.once('close', resolve);
      });

      await closed;
      expect(silent.ws.readyState).toBe(WebSocket.CLOSED);
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
      realtime = { ready: async () => {}, close: async () => {} } as typeof realtime;
    });
  });
});
