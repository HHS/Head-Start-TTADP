/* eslint-disable class-methods-use-this */
// eslint-disable-next-line import/prefer-default-export
export class MeshClient {
  constructor() {
    this.callbacks = {};
  }

  connect() { return jest.fn(() => Promise.resolve()); }

  joinRoom() { return jest.fn(() => Promise.resolve()); }

  publishPresenceState() { jest.fn(() => Promise.resolve()); }

  on() {
    return jest.fn((event, cb) => {
      this.callbacks[event] = cb;
    });
  }

  subscribePresence() {
    return Promise.resolve({
      success: true,
      present: [],
      states: [],
    });
  }

  command() {
    return jest.fn(() => Promise.resolve({
      states: {
        abc: { userId: 1, username: 'test user' },
      },
    }));
  }

  close() { return jest.fn(() => Promise.resolve()); }
}
