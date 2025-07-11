import request from 'supertest';
import { app } from './testingOnly';
import { auditLogger } from './logger';

describe('testingOnly', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('calls anonymous function', async () => {
    jest.spyOn(auditLogger, 'info');
    const response = await request(app).get('/whatever');
    expect(response.statusCode).toEqual(404);
    expect(auditLogger.info).toHaveBeenCalledWith('TestingOnly listening on port 9999');
  });

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

      const mock = jest.fn(createExpressInstance);

      mock.Router = jest.fn(() => mockRouter);

      return mock;
    });

    // // eslint-disable-next-line global-require
    // const { doNothing } = require('./testingOnly');
    // doNothing();
  });
});
