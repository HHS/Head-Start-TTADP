import Queue from 'bull';
import { addToResourceQueue, resourceQueue } from './resourceQueue';

jest.mock('bull');

describe('queue tests', () => {
  beforeAll(() => {
  });
  afterAll(() => {
  });

  it('calls resourceQueue.add', async () => {
    await addToResourceQueue(1);
    expect(Queue).toHaveBeenCalledWith('resource', 'redis://undefined:6379', { redis: { password: undefined } });
    expect(resourceQueue.add).toHaveBeenCalled();
  });
});
