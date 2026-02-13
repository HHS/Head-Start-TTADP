const ORIGINAL_ENV = process.env

let sessionMock
let connectRedisMockFactory
let RedisStoreMock
let getRedisMock
let RedisStoreCtor

function setupSessionMock() {
  const fn = jest.fn((opts) => {
    fn.lastOptions = opts
    // return a no-op middleware
    return (_req, _res, next) => next?.()
  })
  function MockStore() {}
  // provide minimal surface so static analysis doesn’t complain
  MockStore.prototype.get = function get(_sid, _cb) {
    /* no-op for tests */
  }
  MockStore.prototype.set = function set(_sid, _sess, _cb) {
    /* no-op for tests */
  }
  MockStore.prototype.destroy = function destroy(_sid, _cb) {
    /* no-op for tests */
  }
  MockStore.prototype.touch = function touch(_sid, _sess, _cb) {
    /* no-op for tests */
  }

  // emulate session.Store base class (used by connect-redis v6)
  fn.Store = MockStore
  sessionMock = fn
  return {
    __esModule: true,
    default: sessionMock,
  }
}
function setupConnectRedisV6Mock() {
  connectRedisMockFactory = jest.fn((session) => {
    // function-constructor that "extends" session.Store
    function RedisStore(options) {
      session.Store.call(this) // super()
      RedisStore.lastOptions = options // capture options for assertions
    }
    RedisStore.prototype = Object.create(session.Store.prototype, {
      constructor: {
        value: RedisStore,
        enumerable: false,
        writable: true,
        configurable: true,
      },
    })
    RedisStore.prototype.set = function set(_sid, _sess, _cb) {
      /* no-op */
    }
    RedisStore.prototype.get = function get(_sid, _cb) {
      /* no-op */
    }

    RedisStoreCtor = RedisStore
    return RedisStoreCtor
  })

  return { __esModule: true, default: connectRedisMockFactory }
}

function setupGetRedisMock() {
  getRedisMock = jest.fn(() => ({ __fake: 'redis-client' }))
  return {
    __esModule: true,
    getRedis: getRedisMock,
  }
}

async function importFreshSessionMiddleware({ nodeEnv = 'test', secret = 'shhh' } = {}) {
  jest.resetModules()
  process.env = { ...ORIGINAL_ENV, NODE_ENV: nodeEnv, SESSION_SECRET: secret }

  jest.doMock('express-session', setupSessionMock)
  jest.doMock('connect-redis', setupConnectRedisV6Mock)
  jest.doMock('../lib/redisClient', setupGetRedisMock)

  const mod = await import('./sessionMiddleware')
  return mod.default
}

afterEach(() => {
  jest.clearAllMocks()
  jest.resetModules()
  process.env = ORIGINAL_ENV
})

describe('sessionMiddleware (connect-redis v6 + express-session)', () => {
  it('builds a Redis-backed session store with expected options (non-production)', async () => {
    const mw = await importFreshSessionMiddleware({ nodeEnv: 'development', secret: 'dev-secret' })

    // Exported value should be a middleware function
    expect(typeof mw).toBe('function')

    // connect-redis factory should have been called with express-session
    expect(connectRedisMockFactory).toHaveBeenCalledTimes(1)
    expect(connectRedisMockFactory).toHaveBeenCalledWith(sessionMock)

    // RedisStore should have captured constructor options
    const storeOpts = RedisStoreCtor.lastOptions
    expect(storeOpts).toMatchObject({
      client: { __fake: 'redis-client' },
      prefix: 'sess:',
      disableTouch: false,
      ttl: 8 * 60 * 60, // 28800 seconds
    })

    // getRedis() used exactly once at construction time
    expect(getRedisMock).toHaveBeenCalledTimes(1)

    // express-session should be called with the right top-level options
    const sessionOpts = sessionMock.lastOptions
    expect(sessionOpts).toMatchObject({
      name: 'session',
      secret: 'dev-secret',
      resave: false,
      saveUninitialized: false,
      rolling: true,
    })
    // cookie assertions (non-prod => secure: false)
    expect(sessionOpts.cookie).toMatchObject({
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 1000 * 60 * 60 * 8,
    })

    // store is an instance of the mocked RedisStore
    expect(sessionOpts.store).toBeInstanceOf(RedisStoreCtor)
  })

  it('sets cookie.secure=true in production and uses provided SESSION_SECRET', async () => {
    const mw = await importFreshSessionMiddleware({ nodeEnv: 'production', secret: 'prod-secret' })
    expect(typeof mw).toBe('function')

    const sessionOpts = sessionMock.lastOptions
    expect(sessionOpts.secret).toBe('prod-secret')
    expect(sessionOpts.cookie).toMatchObject({
      secure: true,
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 8,
    })
  })
})
