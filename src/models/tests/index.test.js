import httpContext from 'express-http-context';
import { sequelize, gracefulShutdown } from '..';
import { auditLogger } from '../../logger';

jest.mock('express-http-context', () => ({
  get: jest.fn(),
}));

jest.mock('../../logger', () => ({
  auditLogger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Sequelize Tests', () => {
  beforeAll(() => {
    jest.spyOn(sequelize, 'close').mockResolvedValue();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('Graceful shutdown', () => {
    let originalExit;

    beforeAll(() => {
      originalExit = process.exit;
      process.exit = jest.fn();
    });

    afterAll(() => {
      process.exit = originalExit;
    });

    it('should close the sequelize connection and log info on SIGINT', async () => {
      httpContext.get.mockImplementation((key) => {
        const values = {
          loggedUser: 'testUser',
          transactionId: '12345',
          sessionSig: 'abcde',
          impersonationUserId: 'impUser',
          auditDescriptor: 'testDescriptor',
        };
        return values[key];
      });

      process.emit('SIGINT');

      await new Promise((resolve) => { setTimeout(resolve, 100); });

      expect(sequelize.close).toHaveBeenCalled();
      expect(auditLogger.info).toHaveBeenCalledWith('Sequelize disconnected through app termination (SIGINT): {"descriptor":"testDescriptor","loggedUser":"testUser","impersonationId":"impUser","sessionSig":"abcde","transactionId":"12345"}');
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('should close the sequelize connection and log info on SIGTERM', async () => {
      httpContext.get.mockImplementation((key) => {
        const values = {
          loggedUser: 'testUser',
          transactionId: '12345',
          sessionSig: 'abcde',
          impersonationUserId: 'impUser',
          auditDescriptor: 'testDescriptor',
        };
        return values[key];
      });

      process.emit('SIGTERM');

      await new Promise((resolve) => { setTimeout(resolve, 100); });

      expect(sequelize.close).toHaveBeenCalled();
      expect(auditLogger.info).toHaveBeenCalledWith('Sequelize disconnected through app termination (SIGTERM): {"descriptor":"testDescriptor","loggedUser":"testUser","impersonationId":"impUser","sessionSig":"abcde","transactionId":"12345"}');
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('should close the sequelize connection and log error on uncaughtException', async () => {
      const error = new Error('Test error');
      httpContext.get.mockImplementation((key) => {
        const values = {
          loggedUser: 'testUser',
          transactionId: '12345',
          sessionSig: 'abcde',
          impersonationUserId: 'impUser',
          auditDescriptor: 'testDescriptor',
        };
        return values[key];
      });

      process.emit('uncaughtException', error);

      await new Promise((resolve) => { setTimeout(resolve, 100); });

      expect(sequelize.close).toHaveBeenCalled();
      expect(auditLogger.error).toHaveBeenCalledWith('Uncaught Exception:', error);
      expect(auditLogger.info).toHaveBeenCalledWith('Sequelize disconnected through uncaught exception: {"descriptor":"testDescriptor","loggedUser":"testUser","impersonationId":"impUser","sessionSig":"abcde","transactionId":"12345"}');
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should handle graceful shutdown function', async () => {
      httpContext.get.mockImplementation((key) => {
        const values = {
          loggedUser: 'testUser',
          transactionId: '12345',
          sessionSig: 'abcde',
          impersonationUserId: 'impUser',
          auditDescriptor: 'testDescriptor',
        };
        return values[key];
      });

      await gracefulShutdown('test message');

      expect(sequelize.close).toHaveBeenCalled();
      expect(auditLogger.info).toHaveBeenCalledWith('Sequelize disconnected through test message: {"descriptor":"testDescriptor","loggedUser":"testUser","impersonationId":"impUser","sessionSig":"abcde","transactionId":"12345"}');
    });

    it('should log error if sequelize.close throws error', async () => {
      sequelize.close.mockImplementation(() => Promise.reject(new Error('Close error')));
      httpContext.get.mockImplementation((key) => {
        const values = {
          loggedUser: 'testUser',
          transactionId: '12345',
          sessionSig: 'abcde',
          impersonationUserId: 'impUser',
          auditDescriptor: 'testDescriptor',
        };
        return values[key];
      });

      await gracefulShutdown('test message');

      expect(auditLogger.error).toHaveBeenCalledWith('Error during Sequelize disconnection through test message: {"descriptor":"testDescriptor","loggedUser":"testUser","impersonationId":"impUser","sessionSig":"abcde","transactionId":"12345"}: Error: Close error');
    });
  });

  describe('Sequelize Hooks', () => {
    beforeEach(() => {
      jest.restoreAllMocks();
      httpContext.get.mockImplementation((key) => {
        const values = {
          loggedUser: 'testUser',
          transactionId: '12345',
          sessionSig: 'abcde',
          impersonationUserId: 'impUser',
          auditDescriptor: 'testDescriptor',
        };
        return values[key];
      });
    });

    it('should log info before connecting to the database', async () => {
      const beforeConnectHooks = sequelize.options.hooks.beforeConnect;
      expect(Array.isArray(beforeConnectHooks)).toBe(true);
      expect(beforeConnectHooks.length).toBeGreaterThan(0);

      await Promise.all(beforeConnectHooks.map((hook) => hook()));

      expect(auditLogger.info).toHaveBeenCalledWith('Attempting to connect to the database: {"descriptor":"testDescriptor","loggedUser":"testUser","impersonationId":"impUser","sessionSig":"abcde","transactionId":"12345"}');
    });

    it('should log info after connecting to the database', async () => {
      const afterConnectHooks = sequelize.options.hooks.afterConnect;
      expect(Array.isArray(afterConnectHooks)).toBe(true);
      expect(afterConnectHooks.length).toBeGreaterThan(0);

      await Promise.all(afterConnectHooks.map((hook) => hook()));

      expect(auditLogger.info).toHaveBeenCalledWith('Database connection established: {"descriptor":"testDescriptor","loggedUser":"testUser","impersonationId":"impUser","sessionSig":"abcde","transactionId":"12345"}');
    });

    it('should log info before disconnecting from the database', async () => {
      const beforeDisconnectHooks = sequelize.options.hooks.beforeDisconnect;
      expect(Array.isArray(beforeDisconnectHooks)).toBe(true);
      expect(beforeDisconnectHooks.length).toBeGreaterThan(0);

      await Promise.all(beforeDisconnectHooks.map((hook) => hook()));

      expect(auditLogger.info).toHaveBeenCalledWith('Attempting to disconnect from the database: {"descriptor":"testDescriptor","loggedUser":"testUser","impersonationId":"impUser","sessionSig":"abcde","transactionId":"12345"}');
    });

    it('should log info after disconnecting from the database', async () => {
      const afterDisconnectHooks = sequelize.options.hooks.afterDisconnect;
      expect(Array.isArray(afterDisconnectHooks)).toBe(true);
      expect(afterDisconnectHooks.length).toBeGreaterThan(0);

      await Promise.all(afterDisconnectHooks.map((hook) => hook()));

      expect(auditLogger.info).toHaveBeenCalledWith('Database connection closed: {"descriptor":"testDescriptor","loggedUser":"testUser","impersonationId":"impUser","sessionSig":"abcde","transactionId":"12345"}');
    });
  });
});
