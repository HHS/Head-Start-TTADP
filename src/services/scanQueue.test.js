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
    await addToScanQueue('test.txt');
    expect(Queue).toHaveBeenCalledWith('scan', 'redis://undefined:6379', expect.objectContaining({
      maxRetriesPerRequest: 50,
      redis: { password: mockPassword },
      retryStrategy: expect.any(Function),
    }));
    expect(scanQueue.add).toHaveBeenCalled();
  });
});
