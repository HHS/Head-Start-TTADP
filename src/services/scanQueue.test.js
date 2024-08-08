import Queue from 'bull';
import addToScanQueue, { scanQueue } from './scanQueue';

jest.mock('bull');

describe('addToScanQueue', () => {
  const mockPassword = 'SUPERSECUREPASSWORD';
  const originalEnv = process.env;

  beforeAll(() => {
    process.env.REDIS_PASS = mockPassword;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  beforeEach(() => {
    scanQueue.add = jest.fn();
    Queue.mockImplementation(() => scanQueue);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('calls scanQueue.add', async () => {
    await addToScanQueue({ key: 'test.txt' });
    expect(scanQueue.add).toHaveBeenCalledWith(
      {
        key: 'test.txt',
      },
      expect.objectContaining({
        attempts: expect.any(Number),
        backoff: expect.any(Object),
        removeOnComplete: true,
        removeOnFail: true,
      }),
    );
  });
});
