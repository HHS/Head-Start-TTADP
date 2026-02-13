import { auditLogger } from './logger';
import { sequelize, descriptiveDetails, isConnectionOpen } from './models';
import { closeAllQueues } from './lib/queue';
import {
  gracefulShutdown,
  resetShutDownFlag,
  formatLogObject,
  registerEventListener,
} from './processHandler'; // Adjust the import path

jest.mock('./logger', () => ({
  auditLogger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('./models', () => ({
  sequelize: {
    close: jest.fn(),
    connectionManager: {
      pool: {
        _availableObjects: [],
        _inUseObjects: [],
      },
    },
  },
  descriptiveDetails: jest.fn(() => ({ some: 'details' })),
  isConnectionOpen: jest.fn(),
}));

jest.mock('./lib/queue', () => ({
  closeAllQueues: jest.fn(),
}));

describe('processHandler', () => {
  let originalExit;

  beforeAll(() => {
    originalExit = process.exit;
    process.exit = jest.fn();
    registerEventListener();
  });

  afterAll(() => {
    process.exit = originalExit;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    resetShutDownFlag();
  });

  describe('gracefulShutdown', () => {
    it('should close the sequelize connection and log info on success', async () => {
      closeAllQueues.mockResolvedValueOnce();
      sequelize.close.mockResolvedValueOnce();
      isConnectionOpen.mockReturnValueOnce(true);

      await gracefulShutdown('test message');

      expect(closeAllQueues).toHaveBeenCalledWith('test message');
      expect(sequelize.close).toHaveBeenCalledTimes(1);
      expect(auditLogger.info).toHaveBeenCalledWith(
        'Sequelize disconnected through test message: {"some":"details"}',
      );
    });

    it('should log error if sequelize.close throws', async () => {
      closeAllQueues.mockResolvedValueOnce();
      const error = new Error('close error');
      sequelize.close.mockRejectedValueOnce(error);
      isConnectionOpen.mockReturnValueOnce(true);

      await gracefulShutdown('test message');

      expect(closeAllQueues).toHaveBeenCalledWith('test message');
      expect(sequelize.close).toHaveBeenCalledTimes(1);
      expect(auditLogger.error).toHaveBeenCalledWith(
        'Error during Sequelize disconnection through test message: {"some":"details"}: Error: close error',
      );
    });

    it('should log error if closeAllQueues throws and still close sequelize', async () => {
      const error = new Error('queue close error');
      closeAllQueues.mockRejectedValueOnce(error);
      sequelize.close.mockResolvedValueOnce();
      isConnectionOpen.mockReturnValueOnce(true);

      await gracefulShutdown('test message');

      expect(auditLogger.error).toHaveBeenCalledWith(
        'Error during queue shutdown through test message: Error: queue close error',
      );
      expect(sequelize.close).toHaveBeenCalledTimes(1);
      expect(auditLogger.info).toHaveBeenCalledWith(
        'Sequelize disconnected through test message: {"some":"details"}',
      );
    });

    it('should log if sequelize is already disconnected', async () => {
      closeAllQueues.mockResolvedValueOnce();
      isConnectionOpen.mockReturnValueOnce(false);

      await gracefulShutdown('test message');

      expect(closeAllQueues).toHaveBeenCalledWith('test message');
      expect(sequelize.close).not.toHaveBeenCalled();
      expect(auditLogger.info).toHaveBeenCalledWith(
        'Sequelize already disconnected through test message: {"some":"details"}',
      );
    });

    it('should not call gracefulShutdown multiple times concurrently', async () => {
      closeAllQueues.mockResolvedValueOnce();
      sequelize.close.mockResolvedValueOnce();
      isConnectionOpen.mockReturnValueOnce(true);

      // Call gracefulShutdown twice without waiting for the first one to complete
      await Promise.all([gracefulShutdown('test message'), gracefulShutdown('test message')]);

      expect(closeAllQueues).toHaveBeenCalledTimes(1);
      expect(sequelize.close).toHaveBeenCalledTimes(1);
    });
  });

  describe('Process event handlers', () => {
    const emitProcessEvent = async (eventName, ...args) => {
      process.emit(eventName, ...args);
      await new Promise(setImmediate); // Ensure all async code in handlers runs
    };

    it('should handle _fatalException and call gracefulShutdown', async () => {
      const error = new Error('fatal exception');
      closeAllQueues.mockResolvedValueOnce();
      isConnectionOpen.mockReturnValueOnce(true);
      sequelize.close.mockResolvedValueOnce();

      await emitProcessEvent('_fatalException', error);

      expect(auditLogger.error).toHaveBeenCalledWith('Fatal exception', formatLogObject(error));
      expect(closeAllQueues).toHaveBeenCalledWith('fatal exception');
      expect(auditLogger.info).toHaveBeenCalledWith(
        'Sequelize disconnected through fatal exception: {"some":"details"}',
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should handle uncaughtException and call gracefulShutdown', async () => {
      const error = new Error('uncaught exception');
      closeAllQueues.mockResolvedValueOnce();
      isConnectionOpen.mockReturnValueOnce(true);
      sequelize.close.mockResolvedValueOnce();

      await emitProcessEvent('uncaughtException', error);

      expect(auditLogger.error).toHaveBeenCalledWith('Uncaught exception', formatLogObject(error));
      expect(closeAllQueues).toHaveBeenCalledWith('uncaught exception');
      expect(auditLogger.info).toHaveBeenCalledWith(
        'Sequelize disconnected through uncaught exception: {"some":"details"}',
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should handle unhandledRejection and call gracefulShutdown', async () => {
      const reason = new Error('unhandled rejection');
      const promise = Promise.reject(reason);
      closeAllQueues.mockResolvedValueOnce();
      isConnectionOpen.mockReturnValueOnce(true);
      sequelize.close.mockResolvedValueOnce();

      await promise.catch(() => {}); // Prevent unhandledRejection warning in test
      await emitProcessEvent('unhandledRejection', reason, promise);

      expect(auditLogger.error).toHaveBeenCalledWith(
        `Unhandled rejection at: ${promise} reason: ${reason}`,
      );
      expect(closeAllQueues).toHaveBeenCalledWith('app termination (unhandledRejection)');
      expect(auditLogger.info).toHaveBeenCalledWith(
        'Sequelize disconnected through app termination (unhandledRejection): {"some":"details"}',
      );
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should handle unhandledRejection and return early if reason message includes "maxretriesperrequest" in CI environment', async () => {
      const reason = new Error('maxretriesperrequest');
      const promise = Promise.reject(reason);
      process.env.CI = 'true';
      closeAllQueues.mockResolvedValueOnce();
      isConnectionOpen.mockReturnValueOnce(true);

      await promise.catch(() => {}); // Prevent unhandledRejection warning in test
      await emitProcessEvent('unhandledRejection', reason, promise);

      expect(auditLogger.error).toHaveBeenCalledWith(
        `Unhandled rejection at: ${promise} reason: ${reason}`,
      );
      expect(sequelize.close).not.toHaveBeenCalled();
      expect(closeAllQueues).not.toHaveBeenCalled();
      delete process.env.CI; // Clean up CI environment variable
    });

    it('should handle SIGINT and call gracefulShutdown', async () => {
      closeAllQueues.mockResolvedValueOnce();
      isConnectionOpen.mockReturnValueOnce(true);
      sequelize.close.mockResolvedValueOnce();

      await emitProcessEvent('SIGINT');

      expect(auditLogger.error).toHaveBeenCalledWith('Received SIGINT');
      expect(closeAllQueues).toHaveBeenCalledWith('app termination (SIGINT)');
      expect(auditLogger.info).toHaveBeenCalledWith(
        'Sequelize disconnected through app termination (SIGINT): {"some":"details"}',
      );
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('should handle SIGTERM and call gracefulShutdown', async () => {
      closeAllQueues.mockResolvedValueOnce();
      isConnectionOpen.mockReturnValueOnce(true);
      sequelize.close.mockResolvedValueOnce();

      await emitProcessEvent('SIGTERM');

      expect(auditLogger.error).toHaveBeenCalledWith('Received SIGTERM');
      expect(closeAllQueues).toHaveBeenCalledWith('app termination (SIGTERM)');
      expect(auditLogger.info).toHaveBeenCalledWith(
        'Sequelize disconnected through app termination (SIGTERM): {"some":"details"}',
      );
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('should handle SIGUSR1 and call gracefulShutdown', async () => {
      closeAllQueues.mockResolvedValueOnce();
      isConnectionOpen.mockReturnValueOnce(true);
      sequelize.close.mockResolvedValueOnce();

      await emitProcessEvent('SIGUSR1');

      expect(auditLogger.error).toHaveBeenCalledWith('Received SIGUSR1');
      expect(closeAllQueues).toHaveBeenCalledWith('app termination (SIGUSR1)');
      expect(auditLogger.info).toHaveBeenCalledWith(
        'Sequelize disconnected through app termination (SIGUSR1): {"some":"details"}',
      );
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('should handle SIGUSR2 and call gracefulShutdown', async () => {
      closeAllQueues.mockResolvedValueOnce();
      isConnectionOpen.mockReturnValueOnce(true);
      sequelize.close.mockResolvedValueOnce();

      await emitProcessEvent('SIGUSR2');

      expect(auditLogger.error).toHaveBeenCalledWith('Received SIGUSR2');
      expect(closeAllQueues).toHaveBeenCalledWith('app termination (SIGUSR2)');
      expect(auditLogger.info).toHaveBeenCalledWith(
        'Sequelize disconnected through app termination (SIGUSR2): {"some":"details"}',
      );
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('should handle SIGQUIT and call gracefulShutdown', async () => {
      closeAllQueues.mockResolvedValueOnce();
      isConnectionOpen.mockReturnValueOnce(true);
      sequelize.close.mockResolvedValueOnce();

      await emitProcessEvent('SIGQUIT');

      expect(auditLogger.error).toHaveBeenCalledWith('Received SIGQUIT');
      expect(closeAllQueues).toHaveBeenCalledWith('app termination (SIGQUIT)');
      expect(auditLogger.info).toHaveBeenCalledWith(
        'Sequelize disconnected through app termination (SIGQUIT): {"some":"details"}',
      );
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('should handle SIGHUP and call gracefulShutdown', async () => {
      closeAllQueues.mockResolvedValueOnce();
      isConnectionOpen.mockReturnValueOnce(true);
      sequelize.close.mockResolvedValueOnce();

      await emitProcessEvent('SIGHUP');

      expect(auditLogger.error).toHaveBeenCalledWith('Received SIGHUP');
      expect(closeAllQueues).toHaveBeenCalledWith('app termination (SIGHUP)');
      expect(auditLogger.info).toHaveBeenCalledWith(
        'Sequelize disconnected through app termination (SIGHUP): {"some":"details"}',
      );
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('should handle warning events and log warning', async () => {
      const warning = { name: 'TestWarning', message: 'This is a warning', stack: 'stack trace' };
      await emitProcessEvent('warning', warning);

      expect(auditLogger.warn).toHaveBeenCalledWith('Warning:', formatLogObject(warning));
    });

    it('should handle rejectionHandled events and log info', async () => {
      const promise = Promise.resolve();
      await emitProcessEvent('rejectionHandled', promise);

      expect(auditLogger.info).toHaveBeenCalledWith('A previously unhandled promise rejection was handled:', promise);
    });

    it('should handle exit event and log exit code', async () => {
      closeAllQueues.mockResolvedValueOnce();
      isConnectionOpen.mockReturnValueOnce(true);
      sequelize.close.mockResolvedValueOnce();
      await emitProcessEvent('exit', 0);

      expect(auditLogger.info).toHaveBeenCalledWith('About to exit with code: 0');
      expect(closeAllQueues).toHaveBeenCalledWith('app termination (exit event) with code 0');
      expect(auditLogger.info).toHaveBeenCalledWith(
        'Sequelize disconnected through app termination (exit event) with code 0: {"some":"details"}',
      );
    });
  });
});
