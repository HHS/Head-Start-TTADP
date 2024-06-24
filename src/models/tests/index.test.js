const Sequelize = require('sequelize');
const { gracefulShutdown } = require('..');
const { auditLogger } = require('../../logger');

jest.mock('sequelize', () => ({
  Sequelize: jest.fn().mockImplementation(() => ({
    close: jest.fn(() => Promise.resolve()),
  })),
}));

jest.mock('../logger', () => ({
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
    const sequelizeInstance = new Sequelize.Sequelize();
    process.emit('SIGINT');

    await new Promise((resolve) => { setTimeout(resolve, 100); });

    expect(sequelizeInstance.close).toHaveBeenCalled();
    expect(auditLogger.info).toHaveBeenCalledWith('Sequelize disconnected through app termination (SIGINT)');
    expect(process.exit).toHaveBeenCalledWith(0);
  });

  it('should close the sequelize connection and log info on SIGTERM', async () => {
    const sequelizeInstance = new Sequelize.Sequelize();
    process.emit('SIGTERM');

    await new Promise((resolve) => { setTimeout(resolve, 100); });

    expect(sequelizeInstance.close).toHaveBeenCalled();
    expect(auditLogger.info).toHaveBeenCalledWith('Sequelize disconnected through app termination (SIGTERM)');
    expect(process.exit).toHaveBeenCalledWith(0);
  });

  it('should close the sequelize connection and log error on uncaughtException', async () => {
    const sequelizeInstance = new Sequelize.Sequelize();
    const error = new Error('Test error');
    process.emit('uncaughtException', error);

    await new Promise((resolve) => { setTimeout(resolve, 100); });

    expect(sequelizeInstance.close).toHaveBeenCalled();
    expect(auditLogger.error).toHaveBeenCalledWith('Uncaught Exception:', error);
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should handle graceful shutdown function', async () => {
    const sequelizeInstance = new Sequelize.Sequelize();

    await gracefulShutdown('test message');

    expect(sequelizeInstance.close).toHaveBeenCalled();
    expect(auditLogger.info).toHaveBeenCalledWith('Sequelize disconnected through test message');
  });

  it('should log error if sequelize.close throws error', async () => {
    const sequelizeInstance = new Sequelize.Sequelize();
    sequelizeInstance.close.mockImplementation(() => Promise.reject(new Error('Close error')));

    await gracefulShutdown('test message');

    expect(auditLogger.error).toHaveBeenCalledWith('Error during Sequelize disconnection through test message: Close error');
  });
});
