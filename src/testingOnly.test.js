describe('testingOnly', () => {
  test('load testingOnly', async () => {
    jest.mock('express', () => {
      const use = jest.fn((route, callback) => {
        expect(route).toEqual('/testingOnly');
        expect(callback).toBeDefined();
      });

      const listen = jest.fn((port, name, callback) => {
        expect(port).toEqual(9999);
        expect(name).toEqual('localhost');
        expect(callback).toBeDefined();
      });

      const get = jest.fn(() => {});

      const mockRouter = {
        get,
      };

      function createExpressInstance() {
        const instance = () => {};
        instance.use = use;
        instance.listen = listen;
        instance.Router = jest.fn(() => mockRouter);
        return instance;
      }

      const express = jest.fn(createExpressInstance);

      express.Router = jest.fn(() => mockRouter);

      return express;
    });

    // eslint-disable-next-line global-require
    const { doNothing } = require('./testingOnly');
    doNothing();
  });
});
