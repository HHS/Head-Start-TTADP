import Queue from 'bull';
import addToScanQueue from './queue';

jest.mock('bull');

describe('queue tests', () => {
  beforeEach(() => Queue.mockClear());

  it('calls scanQueue.add', async () => {
    await addToScanQueue('test.txt');
    expect(Queue.add).toHaveBeenCalled();
  });
});
