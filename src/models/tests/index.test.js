import Sequelize from 'sequelize';
import { gracefulShutdown, sequelize } from '..';
import { auditLogger } from '../../logger';

jest.mock('sequelize', () => {
  const Sequelize = jest.fn().mockImplementation(() => ({
    authenticate: jest.fn(() => Promise.resolve()),
    close: jest.fn(() => Promise.resolve()),
    addHook: jest.fn(),
  }));

  Sequelize.useCLS = jest.fn();
  Sequelize.Sequelize = Sequelize;

  return {
    Sequelize,
    useCLS: Sequelize.useCLS,
  };
});


jest.mock('../../logger', () => ({
  auditLogger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

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

    expect(auditLogger.error).toHaveBeenCalledWith('Error during Sequelize disconnection through test message: Close error');
  });
});

describe('Sequelize Hooks', () => {
  it('should log info before connecting to the database', async () => {
    const beforeConnectHook = sequelize.addHook.mock.calls.find((call) => call[0] === 'beforeConnect')[1];
    await beforeConnectHook();
    expect(auditLogger.info).toHaveBeenCalledWith('Attempting to connect to the database');
  });

  it('should log info after connecting to the database', async () => {
    const afterConnectHook = sequelize.addHook.mock.calls.find((call) => call[0] === 'afterConnect')[1];
    await afterConnectHook();
    expect(auditLogger.info).toHaveBeenCalledWith('Database connection established');
  });

  it('should log info before disconnecting from the database', async () => {
    const beforeDisconnectHook = sequelize.addHook.mock.calls.find((call) => call[0] === 'beforeDisconnect')[1];
    await beforeDisconnectHook();
    expect(auditLogger.info).toHaveBeenCalledWith('Attempting to disconnect from the database');
  });

  it('should log info after disconnecting from the database', async () => {
    const afterDisconnectHook = sequelize.addHook.mock.calls.find((call) => call[0] === 'afterDisconnect')[1];
    await afterDisconnectHook();
    expect(auditLogger.info).toHaveBeenCalledWith('Database connection closed');
  });
});
