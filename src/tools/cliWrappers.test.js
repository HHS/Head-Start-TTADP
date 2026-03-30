/* eslint-disable global-require */

describe('CLI wrappers', () => {
  let exitSpy;

  beforeEach(() => {
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => undefined);
  });

  afterEach(() => {
    exitSpy.mockRestore();
    jest.resetModules();
    jest.clearAllMocks();
  });

  function loadCli(modulePath) {
    switch (modulePath) {
      case './createMonitoringGoalsCLI':
        require('./createMonitoringGoalsCLI');
        break;
      case './queryMonitoringDataCLI':
        require('./queryMonitoringDataCLI');
        break;
      case './maintainMonitoringDataCLI':
        require('./maintainMonitoringDataCLI');
        break;
      default:
        throw new Error(`Unknown CLI module: ${modulePath}`);
    }
  }

  async function runCli(modulePath, mockPath, implementation) {
    jest.doMock(mockPath, () => ({
      __esModule: true,
      default: implementation,
    }));
    jest.doMock('../logger', () => ({
      auditLogger: {
        error: jest.fn(),
      },
    }));

    jest.isolateModules(() => {
      loadCli(modulePath);
    });

    await new Promise(setImmediate);
    return exitSpy;
  }

  it.each([
    ['./createMonitoringGoalsCLI', './createMonitoringGoals'],
    ['./queryMonitoringDataCLI', './queryMonitoringData'],
    ['./maintainMonitoringDataCLI', './maintainMonitoringData'],
  ])('%s exits with status 1 on failure', async (modulePath, mockPath) => {
    const cliExitSpy = await runCli(modulePath, mockPath, jest.fn().mockRejectedValue(new Error('boom')));
    expect(cliExitSpy).toHaveBeenCalledWith(1);
    expect(cliExitSpy).not.toHaveBeenCalledWith(0);
  });

  it.each([
    ['./createMonitoringGoalsCLI', './createMonitoringGoals'],
    ['./queryMonitoringDataCLI', './queryMonitoringData'],
    ['./maintainMonitoringDataCLI', './maintainMonitoringData'],
  ])('%s exits with status 0 on success', async (modulePath, mockPath) => {
    const cliExitSpy = await runCli(modulePath, mockPath, jest.fn().mockResolvedValue(undefined));
    expect(cliExitSpy).toHaveBeenCalledWith(0);
  });
});
