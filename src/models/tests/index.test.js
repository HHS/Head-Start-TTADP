import { sequelize, gracefulShutdown } from '..';
import { auditLogger } from '../../logger';

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
      process.emit('SIGINT');

      await new Promise((resolve) => { setTimeout(resolve, 100); });

      expect(sequelize.close).toHaveBeenCalled();
      expect(auditLogger.info).toHaveBeenCalledWith('Sequelize disconnected through app termination (SIGINT)');
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('should close the sequelize connection and log info on SIGTERM', async () => {
      process.emit('SIGTERM');

      await new Promise((resolve) => { setTimeout(resolve, 100); });

      expect(sequelize.close).toHaveBeenCalled();
      expect(auditLogger.info).toHaveBeenCalledWith('Sequelize disconnected through app termination (SIGTERM)');
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('should close the sequelize connection and log error on uncaughtException', async () => {
      const error = new Error('Test error');
      process.emit('uncaughtException', error);

      await new Promise((resolve) => { setTimeout(resolve, 100); });

      expect(sequelize.close).toHaveBeenCalled();
      expect(auditLogger.error).toHaveBeenCalledWith('Uncaught Exception:', error);
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should handle graceful shutdown function', async () => {
      await gracefulShutdown('test message');

      expect(sequelize.close).toHaveBeenCalled();
      expect(auditLogger.info).toHaveBeenCalledWith('Sequelize disconnected through test message');
    });

    it('should log error if sequelize.close throws error', async () => {
      sequelize.close.mockImplementation(() => Promise.reject(new Error('Close error')));

      await gracefulShutdown('test message');

      // Check the calls to auditLogger.error
      expect(auditLogger.error).toHaveBeenNthCalledWith(1, 'Uncaught Exception:', expect.any(Error));
      expect(auditLogger.error).toHaveBeenNthCalledWith(2, 'Error during Sequelize disconnection through test message: Error: Close error');
    });

  });

  describe('Sequelize Hooks', () => {
    beforeEach(() => {
      jest.restoreAllMocks();
    });
    it('should log info before connecting to the database', async () => {
      const beforeConnectHooks = sequelize.options.hooks.beforeConnect;
      expect(Array.isArray(beforeConnectHooks)).toBe(true);
      expect(beforeConnectHooks.length).toBeGreaterThan(0);

      await Promise.all(beforeConnectHooks.map(hook => hook()));

      expect(auditLogger.info).toHaveBeenCalledWith('Attempting to connect to the database');
    });

    it('should log info after connecting to the database', async () => {
      const afterConnectHooks = sequelize.options.hooks.afterConnect;
      expect(Array.isArray(afterConnectHooks)).toBe(true);
      expect(afterConnectHooks.length).toBeGreaterThan(0);

      await Promise.all(afterConnectHooks.map(hook => hook()));

      expect(auditLogger.info).toHaveBeenCalledWith('Database connection established');
    });

    it('should log info before disconnecting from the database', async () => {
      const beforeDisconnectHooks = sequelize.options.hooks.beforeDisconnect;
      expect(Array.isArray(beforeDisconnectHooks)).toBe(true);
      expect(beforeDisconnectHooks.length).toBeGreaterThan(0);

      await Promise.all(beforeDisconnectHooks.map(hook => hook()));

      expect(auditLogger.info).toHaveBeenCalledWith('Attempting to disconnect from the database');
    });

    it('should log info after disconnecting from the database', async () => {
      const afterDisconnectHooks = sequelize.options.hooks.afterDisconnect;
      expect(Array.isArray(afterDisconnectHooks)).toBe(true);
      expect(afterDisconnectHooks.length).toBeGreaterThan(0);

      await Promise.all(afterDisconnectHooks.map(hook => hook()));

      expect(auditLogger.info).toHaveBeenCalledWith('Database connection closed');
    });
  });
});
