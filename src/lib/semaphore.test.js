import Semaphore from './semaphore';

describe('Semaphore', () => {
  it('should initialize correctly', () => {
    const maxConcurrency = 3;
    const semaphore = new Semaphore(maxConcurrency);
    expect(semaphore.maxConcurrency).toBe(maxConcurrency);
    expect(semaphore.data[''].currentConcurrency).toBe(0);
    expect(semaphore.data[''].waiting).toEqual([]);
  });

  it('should block threads when max currentConcurrency is reached', async () => {
    const semaphore = new Semaphore();

    // Acquire first lock
    await semaphore.acquire();

    // Second lock should block
    const acquirePromise = semaphore.acquire();
    expect(semaphore.data[''].currentConcurrency).toBe(1);
    expect(semaphore.data[''].waiting.length).toBe(1);

    // Release first lock
    semaphore.release();

    // Second lock should be acquired after first is released
    await acquirePromise;
    expect(semaphore.data[''].currentConcurrency).toBe(1);
    expect(semaphore.data[''].waiting.length).toBe(0);
  });

  it('should release blocked threads when released', async () => {
    const maxConcurrency = 1;
    const semaphore = new Semaphore(maxConcurrency);

    // Acquire first lock
    await semaphore.acquire();

    // Second lock should block
    const acquirePromise = semaphore.acquire();
    expect(semaphore.data[''].currentConcurrency).toBe(1);
    expect(semaphore.data[''].waiting.length).toBe(1);

    // Release first lock
    semaphore.release();

    // Second lock should be acquired after first is released
    await acquirePromise;
    expect(semaphore.data[''].currentConcurrency).toBe(1);
    expect(semaphore.data[''].waiting.length).toBe(0);

    // Release second lock
    semaphore.release();
    expect(semaphore.data[''].currentConcurrency).toBe(0);
  });
});
