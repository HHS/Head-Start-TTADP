import { getWhatsNewFeedData, getSingleFeedData } from './feed'

jest.mock('axios', () => ({
  get: jest.fn(() => ({
    data: 'value',
  })),
}))

jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    get: jest.fn(() => null),
    set: jest.fn(),
    quit: jest.fn(),
  })),
}))

jest.mock('../lib/cache', () => ({
  __esModule: true,
  default: jest.fn((_key, cb) => cb()),
}))

jest.mock('../lib/queue', () => ({
  generateRedisConfig: jest.fn(() => ({
    uri: 'arg',
    tlsEnabled: true,
  })),
}))

describe('fetchWhatsNewFeedData', () => {
  afterAll(() => jest.clearAllMocks())
  it('returns the feed data', async () => {
    const response = await getWhatsNewFeedData()
    expect(response).toEqual('value')
  })
})

describe('getSingleFeedData', () => {
  afterAll(() => jest.clearAllMocks())
  it('returns the feed data', async () => {
    const response = await getSingleFeedData('tag')
    expect(response).toEqual('value')
  })
})
