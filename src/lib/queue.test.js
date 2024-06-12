import { increaseListeners } from './queue';

describe('increaseListeners', () => {
  const MAX_LISTENERS = 20;
  let queue;
  let redisClient;

  beforeEach(() => {
    redisClient = {
      getMaxListeners: jest.fn().mockReturnValue(10),
      setMaxListeners: jest.fn(),
    };
    queue = {
      client: redisClient,
      eventNames: jest.fn().mockReturnValue(['event1', 'event2']),
      listenerCount: jest.fn().mockImplementation((eventName) => {
        if (eventName === 'event1') return 5;
        if (eventName === 'event2') return 3;
        return 0;
      }),
    };
  });

  it('increases max listeners if new total exceeds current max', async () => {
    await increaseListeners(queue, 3);
    expect(redisClient.setMaxListeners).toHaveBeenCalledWith(11);
  });

  it('does not change max listeners if new total does not exceed current max', async () => {
    await increaseListeners(queue, 2);
    expect(redisClient.setMaxListeners).not.toHaveBeenCalled();
  });

  it('caps listener increase at MAX_LISTENERS constant', async () => {
    await increaseListeners(queue, 15);
    expect(redisClient.setMaxListeners).toHaveBeenCalledWith(MAX_LISTENERS);
  });

  it('does nothing if queue has no client', async () => {
    queue.client = null;
    await increaseListeners(queue, 1);
    expect(redisClient.setMaxListeners).not.toHaveBeenCalled();
  });
});
