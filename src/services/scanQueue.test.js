import Queue from 'bull';
import addToScanQueue, { scanQueue } from './scanQueue';

jest.mock('bull');

describe('queue tests', () => {
  beforeAll(() => {
  });
  afterAll(() => {
  });
  // beforeEach(() => Queue.add.mockClear());

  it('calls scanQueue.add', async () => {
    await addToScanQueue('test.txt');
    // expect(Queue).toHaveBeenCalledWith('scan', 'redis://undefined:6379', { redis: { password: undefined } });
    expect(Queue).toHaveBeenCalledWith('scan', 'redis://undefined:6379', { defaultJobOptions: { attempts: 3, backoff: { type: 'exponential' }, removeOnComplete: true }, redis: { password: undefined } });
    expect(scanQueue.add).toHaveBeenCalled();
  });
});
