import { propagateDestroyToFile } from './genericFile';

describe('propagateDestroyToFile', () => {
  it('should delete the file if it is not associated with any other models', async () => {
    const mockFileDestroy = jest.fn();
    const mockSequelize = {
      models: {
        File: {
          findOne: jest.fn(() => ({
            reportFiles: [],
            reportObjectiveFiles: [],
            objectiveFiles: [],
            objectiveTemplateFiles: [],
            id: 1,
          })),
          destroy: mockFileDestroy,
        },
      },
    };
    const mockInstance = {
      fileId: 1,
    };
    const mockOptions = {
      transaction: {},
    };

    await propagateDestroyToFile(mockSequelize, mockInstance, mockOptions);

    expect(mockFileDestroy).toHaveBeenCalledWith({
      where: { id: 1 },
      transaction: {},
    });
  });

  it('won\'t destroy the file if its on a report', async () => {
    const mockFileDestroy = jest.fn();
    const mockSequelize = {
      models: {
        File: {
          findOne: jest.fn(() => ({
            reportFiles: [{}],
            reportObjectiveFiles: [],
            objectiveFiles: [],
            objectiveTemplateFiles: [],
            id: 1,
          })),
          destroy: mockFileDestroy,
        },
      },
    };
    const mockInstance = {
      fileId: 1,
    };
    const mockOptions = {
      transaction: {},
    };

    await propagateDestroyToFile(mockSequelize, mockInstance, mockOptions);

    expect(mockFileDestroy).not.toHaveBeenCalled();
  });

  it('won\'t destroy the file if its on a report objective', async () => {
    const mockFileDestroy = jest.fn();
    const mockSequelize = {
      models: {
        File: {
          findOne: jest.fn(() => ({
            reportFiles: [],
            reportObjectiveFiles: [{}],
            objectiveFiles: [],
            objectiveTemplateFiles: [],
            id: 1,
          })),
          destroy: mockFileDestroy,
        },
      },
    };
    const mockInstance = {
      fileId: 1,
    };
    const mockOptions = {
      transaction: {},
    };

    await propagateDestroyToFile(mockSequelize, mockInstance, mockOptions);

    expect(mockFileDestroy).not.toHaveBeenCalled();
  });

  it('won\'t destroy the file if its on an objective', async () => {
    const mockFileDestroy = jest.fn();
    const mockSequelize = {
      models: {
        File: {
          findOne: jest.fn(() => ({
            reportFiles: [],
            reportObjectiveFiles: [],
            objectiveFiles: [{}],
            objectiveTemplateFiles: [],
            id: 1,
          })),
          destroy: mockFileDestroy,
        },
      },
    };
    const mockInstance = {
      fileId: 1,
    };
    const mockOptions = {
      transaction: {},
    };

    await propagateDestroyToFile(mockSequelize, mockInstance, mockOptions);

    expect(mockFileDestroy).not.toHaveBeenCalled();
  });

  it('won\'t destroy the file if its on an objective template', async () => {
    const mockFileDestroy = jest.fn();
    const mockSequelize = {
      models: {
        File: {
          findOne: jest.fn(() => ({
            reportFiles: [],
            reportObjectiveFiles: [],
            objectiveFiles: [],
            objectiveTemplateFiles: [{}],
            id: 1,
          })),
          destroy: mockFileDestroy,
        },
      },
    };
    const mockInstance = {
      fileId: 1,
    };
    const mockOptions = {
      transaction: {},
    };

    await propagateDestroyToFile(mockSequelize, mockInstance, mockOptions);

    expect(mockFileDestroy).not.toHaveBeenCalled();
  });
});
