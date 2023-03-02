export default class Semaphore {
  constructor(maxConcurrency = 1) {
    // Max number of concurrent operations the semaphore will allow
    this.maxConcurrency = maxConcurrency;

    // Current number of concurrent operations the semaphore has processing
    this.currentConcurrency = 0;

    // Array of promises blocking holding back all instances waiting for the semaphore
    this.waiting = [];
  }

  async acquire() {
    // When there is still available in the concurrency, take it
    if (this.currentConcurrency < this.maxConcurrency) {
      // eslint-disable-next-line no-plusplus
      this.currentConcurrency++;
    } else {
      // When no room is available in the concurrency, push a promise into the array
      // and wait for it to be resolved
      await new Promise((resolve) => {
        this.waiting.push(resolve);
      });
    }
  }

  release() {
    // When a promise is waiting, resolve the oldest one
    if (this.waiting.length > 0) {
      const resolve = this.waiting.shift();
      if (resolve) resolve();
    } else {
      // When no more promises are waiting decrament the current concurrency
      // eslint-disable-next-line no-plusplus
      this.currentConcurrency--;
    }
  }
}
