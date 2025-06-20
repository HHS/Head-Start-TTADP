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

  it('should not crash when releasing without any operation in progress', () => {
    const semaphore = new Semaphore();
    expect(() => semaphore.release()).not.toThrow();
  });

  it('should correctly decrement currentConcurrency when no waiting promises', async () => {
    const semaphore = new Semaphore(2);

    // Acquire two locks
    await semaphore.acquire();
    await semaphore.acquire();
    expect(semaphore.data[''].currentConcurrency).toBe(2);

    // Release one lock
    semaphore.release();
    expect(semaphore.data[''].currentConcurrency).toBe(1);
  });

  it('should resolve the oldest waiting promise when released', async () => {
    const semaphore = new Semaphore(1);

    // Acquire the first lock
    await semaphore.acquire();
    let wasFirstPromiseResolved = false;
    let wasSecondPromiseResolved = false;

    // Attempt to acquire two more locks
    semaphore.acquire().then(() => {
      wasFirstPromiseResolved = true;
    });
    semaphore.acquire().then(() => {
      wasSecondPromiseResolved = true;
    });

    // Initially, none should be resolved
    expect(wasFirstPromiseResolved).toBe(false);
    expect(wasSecondPromiseResolved).toBe(false);

    // Release the lock, expecting the first waiting promise to resolve
    semaphore.release();
    await new Promise(
      // eslint-disable-next-line no-promise-executor-return
      (resolve) => setTimeout(resolve, 0),
    ); // Wait for promises to potentially resolve
    expect(wasFirstPromiseResolved).toBe(true);
    expect(wasSecondPromiseResolved).toBe(false);

    // Release the lock again, expecting the second waiting promise to resolve
    semaphore.release();
    await new Promise(
      // eslint-disable-next-line no-promise-executor-return
      (resolve) => setTimeout(resolve, 0),
    ); // Wait for promises to potentially resolve
    expect(wasSecondPromiseResolved).toBe(true);
  });
});
