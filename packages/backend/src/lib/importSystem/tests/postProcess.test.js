import { Import } from '../../../models';
import handlePostProcessing from '../postProcess';
import { auditLogger } from '../../../logger';
import createMonitoringGoals from '../../../tools/createMonitoringGoals';

jest.mock('../../../logger');
jest.mock('../../../models', () => ({
  Import: {
    findOne: jest.fn(),
  },
}));
jest.mock('../../../tools/createMonitoringGoals', () => jest.fn());

describe('processRecords', () => {
  afterAll(() => {
    // Restore mocks.
    jest.restoreAllMocks();
  });
  afterEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  it('logs a warning if the post process function is not found', async () => {
    // Mock Import.findOne to return the data we want to test.
    const mockRecord = {
      id: 1,
      name: 'Bad Post Process Import',
      postProcessingActions: [{
        name: 'Bad Post Process',
        function: 'badPostProcess',
      }],
    };

    // Mock the find one to return the mockRecord.
    Import.findOne.mockResolvedValue(mockRecord);

    // Call post processing.
    await handlePostProcessing(1);

    // Assert
    expect(auditLogger.error).toHaveBeenCalledWith('Unknown import post processing action: badPostProcess for import: 1 - Bad Post Process Import skipping');
  });

  it('properly calls the post process function', async () => {
    // Mock Import.findOne to return the data we want to test.
    const mockRecord = {
      id: 1,
      name: 'Good Post Process Import',
      postProcessingActions: [{
        name: 'Good Post Process',
        function: 'createMonitoringGoals',
      }],
    };

    // Mock the find one to return the mockRecord.
    Import.findOne.mockResolvedValue(mockRecord);

    // Mock the post process function.
    const mockPostProcess = jest.fn();

    // Call post processing.
    await handlePostProcessing(1);

    // Expect auditLogger.info to have been called with the correct message.
    expect(auditLogger.info).toHaveBeenCalledWith('Starting Post Processing: Creating monitoring goals for import: 1 - Good Post Process Import task: Good Post Process');
    expect(createMonitoringGoals).toHaveBeenCalled();
    expect(auditLogger.info).toHaveBeenCalledWith('Finished Post Processing: Creating monitoring goals for import: 1 - Good Post Process Import task: Good Post Process');
  });

  it('properly logs an error if the post process function throws an error', async () => {
    // Mock Import.findOne to return the data we want to test.
    const mockRecord = {
      id: 1,
      name: 'Error Post Process Import',
      postProcessingActions: [{
        name: 'Error Post Process',
        function: 'createMonitoringGoals',
      }],
    };

    // Mock the find one to return the mockRecord.
    Import.findOne.mockResolvedValue(mockRecord);

    // Mock the post process function.
    createMonitoringGoals.mockRejectedValue(new Error('Test Error'));

    // Call post processing.
    await handlePostProcessing(1);

    // Expect auditLogger.error to have been called with the correct message.
    expect(auditLogger.error).toHaveBeenCalledWith('Error in Import - handlePostProcessing: Test Error', new Error('Test Error'));
  });

  it('properly runs all valid functions even if some are invalid', async () => {
    // Mock Import.findOne to return the data we want to test.
    const mockRecord = {
      id: 1,
      name: 'Mixed Post Process Import',
      postProcessingActions: [
        {
          name: 'Bad Post Process',
          function: 'badPostProcess',
        },
        {
          name: 'Good Post Process',
          function: 'createMonitoringGoals',
        },
      ],
    };

    // Mock the find one to return the mockRecord.
    Import.findOne.mockResolvedValue(mockRecord);

    // Call post processing.
    await handlePostProcessing(1);

    // Expect auditLogger.info to have been called with the correct message.
    expect(auditLogger.info).toHaveBeenCalledWith('Starting Post Processing: Creating monitoring goals for import: 1 - Mixed Post Process Import task: Good Post Process');
    expect(createMonitoringGoals).toHaveBeenCalled();
    expect(auditLogger.info).toHaveBeenCalledWith('Finished Post Processing: Creating monitoring goals for import: 1 - Mixed Post Process Import task: Good Post Process');
    expect(auditLogger.error).toHaveBeenCalledWith('Unknown import post processing action: badPostProcess for import: 1 - Mixed Post Process Import skipping');
  });

  it('correctly runs valid jobs even if one throws an error', async () => {
    // Mock Import.findOne to return the data we want to test.
    const mockRecord = {
      id: 1,
      name: 'Mixed Error Post Process Import',
      postProcessingActions: [
        {
          name: 'Error Post Process',
          function: 'createMonitoringGoals',
        },
        {
          name: 'Good Post Process',
          function: 'createMonitoringGoals',
        },
      ],
    };

    // Mock the find one to return the mockRecord.
    Import.findOne.mockResolvedValue(mockRecord);

    // Mock the post process function.
    createMonitoringGoals.mockRejectedValueOnce(new Error('Test Error'));

    // Call post processing.
    await handlePostProcessing(1);

    // Expect auditLogger.info to have been called with the correct message.
    expect(auditLogger.info).toHaveBeenCalledWith('Starting Post Processing: Creating monitoring goals for import: 1 - Mixed Error Post Process Import task: Error Post Process');
    expect(auditLogger.info).toHaveBeenCalledWith('Starting Post Processing: Creating monitoring goals for import: 1 - Mixed Error Post Process Import task: Good Post Process');
    expect(auditLogger.info).toHaveBeenCalledWith('Finished Post Processing: Creating monitoring goals for import: 1 - Mixed Error Post Process Import task: Good Post Process');
    expect(auditLogger.error).toHaveBeenCalledWith('Error in Import - handlePostProcessing: Test Error', new Error('Test Error'));
    expect(createMonitoringGoals).toHaveBeenCalled();
  });
});
