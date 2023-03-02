export default class Semaphore {
  constructor(maxResources) {
    this.maxResources = maxResources;
    this.usedResources = 0;
    this.waiting = [];
  }

  async acquire() {
    if (this.usedResources < this.maxResources) {
      // eslint-disable-next-line no-plusplus
      this.usedResources++;
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this.waiting.push(resolve);
    });
  }

  release() {
    if (this.waiting.length > 0) {
      const resolve = this.waiting.shift();
      resolve();
    } else {
      // eslint-disable-next-line no-plusplus
      this.usedResources--;
    }
  }
}
