export default class Semaphore {
  constructor(maxConcurrency = 1) {
    // Max number of concurrent operations the semaphore will allow
    this.maxConcurrency = maxConcurrency

    this.data = {
      '': {
        currentConcurrency: 0,
        waiting: [],
      },
    }
  }

  async acquire(bucket = '') {
    let datum = this.data[bucket]
    if (!datum) {
      this.data[bucket] = {
        // Current number of concurrent operations the semaphore has processing
        currentConcurrency: 0,
        // Array of promises blocking holding back all instances waiting for the semaphore
        waiting: [],
      }
      datum = this.data[bucket]
    }
    // When there is still available in the concurrency, take it
    if (datum.currentConcurrency < this.maxConcurrency) {
      // eslint-disable-next-line no-plusplus
      datum.currentConcurrency++
    } else {
      // When no room is available in the concurrency, push a promise into the array
      // and wait for it to be resolved
      await new Promise((resolve) => {
        datum.waiting.push(resolve)
      })
    }
  }

  release(bucket = '') {
    const datum = this.data[bucket]
    if (datum) {
      // When a promise is waiting, resolve the oldest one
      if (datum.waiting.length > 0) {
        const resolve = datum.waiting.shift()
        if (resolve) resolve()
      } else {
        // When no more promises are waiting decrement the current concurrency
        // eslint-disable-next-line no-plusplus
        datum.currentConcurrency--
      }
    }
  }
}
