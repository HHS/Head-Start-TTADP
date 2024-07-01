import httpContext from 'express-http-context';
import { sequelize, isConnectionOpen } from '..';
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

  describe('isConnectionOpen', () => {
    it('should return false when there is no pool', () => {
      sequelize.connectionManager.pool = null;

      const result = isConnectionOpen();

      expect(result).toBe(false);
    });

    it('should return false when there are no active connections in the pool', () => {
      sequelize.connectionManager.pool = {
        _availableObjects: [],
        _inUseObjects: [],
      };

      const result = isConnectionOpen();

      expect(result).toBe(false);
    });

    it('should return true when there are available objects in the pool', () => {
      sequelize.connectionManager.pool = {
        _availableObjects: [{}],
        _inUseObjects: [],
      };

      const result = isConnectionOpen();

      expect(result).toBe(true);
    });

    it('should return true when there are in-use objects in the pool', () => {
      sequelize.connectionManager.pool = {
        _availableObjects: [],
        _inUseObjects: [{}],
      };

      const result = isConnectionOpen();

      expect(result).toBe(true);
    });
  });
});
