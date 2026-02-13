const ctorCalls = []
let onSpy
let quitSpy
let disconnectSpy

function makeRedisMock({ quitThrows = false } = {}) {
  onSpy = jest.fn()
  quitSpy = quitThrows ? jest.fn().mockRejectedValue(new Error('rejected')) : jest.fn().mockResolvedValue(undefined)
  disconnectSpy = jest.fn()

  class RedisMock {
    constructor(uri, opts = {}) {
      this.status = 'ready'
      this.options = opts
      ctorCalls.push([uri, opts])
    }

    on = onSpy

    quit = jest.fn(async () => {
      await quitSpy()
      this.status = 'end'
    })

    disconnect = jest.fn(() => {
      disconnectSpy()
      this.status = 'end'
    })

    static duplicate(opts) {
      return new RedisMock('duplicate://', opts)
    }
  }
  return RedisMock
}

async function importFresh({ tlsEnabled = false, uri = 'redis://:pass@localhost:6379', quitThrows = false } = {}) {
  jest.resetModules()
  ctorCalls.length = 0

  jest.doMock('../lib/queue', () => ({
    __esModule: true,
    generateRedisConfig: () => ({ uri, tlsEnabled }),
  }))

  jest.doMock('ioredis', () => ({
    __esModule: true,
    default: makeRedisMock({ quitThrows }),
  }))

  return import('./redisClient')
}

afterEach(() => {
  jest.clearAllMocks()
  jest.resetModules()
})

describe('redisClient', () => {
  test('getRedis creates a singleton and reuses it', async () => {
    const mod = await importFresh({ tlsEnabled: false, uri: 'redis://:pass@localhost:6379' })
    const { getRedis } = mod

    const a = getRedis()
    const b = getRedis()

    expect(a).toBe(b)
    expect(ctorCalls).toHaveLength(1)
    expect(ctorCalls[0][0]).toBe('redis://:pass@localhost:6379')
    expect(ctorCalls[0][1]).toMatchObject({ connectionName: 'app:base' })
  })

  test('passes TLS opts when tlsEnabled=true', async () => {
    const mod = await importFresh({ tlsEnabled: true, uri: 'rediss://redis.example:6380' })
    const { getRedis } = mod

    getRedis()

    expect(ctorCalls).toHaveLength(1)
    const [, opts] = ctorCalls[0]
    expect(opts.connectionName).toBe('app:base')
    expect(opts.tls).toEqual({ rejectUnauthorized: false })
  })

  test('omits TLS opts when tlsEnabled=false', async () => {
    const mod = await importFresh({ tlsEnabled: false })
    const { getRedis } = mod

    getRedis()

    const [, opts] = ctorCalls[0]
    expect(opts.tls).toBeUndefined()
    expect(opts.connectionName).toBe('app:base')
  })

  test('registers an error listener', async () => {
    const mod = await importFresh()
    const { getRedis } = mod

    getRedis()

    expect(onSpy).toHaveBeenCalledWith('error', expect.any(Function))
  })

  test('closeRedis calls quit() when client is active', async () => {
    const mod = await importFresh()
    const { getRedis, closeRedis } = mod

    const c = getRedis()
    expect(c.status).toBe('ready')

    await closeRedis()

    expect(ctorCalls).toHaveLength(1)
    expect(quitSpy).toHaveBeenCalledTimes(1)
    expect(disconnectSpy).not.toHaveBeenCalled()
  })

  test('closeRedis falls back to disconnect() if quit() throws', async () => {
    const mod = await importFresh({ quitThrows: true })
    const { getRedis, closeRedis } = mod

    getRedis()

    await closeRedis()

    expect(quitSpy).toHaveBeenCalledTimes(1)
    expect(disconnectSpy).toHaveBeenCalledTimes(1)
  })

  test('closeRedis no-ops when client status is end', async () => {
    const mod = await importFresh()
    const { getRedis, closeRedis } = mod

    const c = getRedis()
    c.status = 'end' // simulate already closed

    await closeRedis()

    expect(quitSpy).not.toHaveBeenCalled()
    expect(disconnectSpy).not.toHaveBeenCalled()
  })
})
