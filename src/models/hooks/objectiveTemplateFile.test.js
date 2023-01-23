import { AUTOMATIC_CREATION } from '../../constants';
import { propagateCreateToTemplate, propagateDestroyToTemplate, checkForUseOnApprovedReport } from './objectiveTemplateFile';

describe('objectiveTemplateFile hooks', () => {
  describe('propagateCreateToTemplate', () => {
    afterEach(() => jest.clearAllMocks());
    it('should update the objective template updatedAt field', async () => {
      const objectiveTemplateFileUpdate = jest.fn();
      const mockSequelize = {
        models: {
          Objective: {
            findOne: jest.fn(() => ({
              id: 1,
              objectiveTemplate: {
                creationMethod: AUTOMATIC_CREATION,
              },
            })),
          },
          ObjectiveTemplate: {},
          ObjectiveTemplateFile: {
            findOrCreate: jest.fn(() => [
              {
                id: 1,
                objectiveTemplate: {
                  objectives: [
                    {
                      id: 1,
                    },
                  ],
                },
              },
              true,
            ]),
            update: objectiveTemplateFileUpdate,
          },
        },
      };

      const mockInstance = {
        objectiveId: 1,
        objective: {
          objectiveTemplateId: 1,
        },
        fileId: 1,
      };
      const mockOptions = {
        transaction: 'transaction',
      };

      await propagateCreateToTemplate(mockSequelize, mockInstance, mockOptions);
      expect(objectiveTemplateFileUpdate).toHaveBeenCalled();
    });
    it('won\'t call update if no objective is found', async () => {
      const objectiveTemplateFileUpdate = jest.fn();
      const mockSequelize = {
        models: {
          Objective: {
            findOne: jest.fn(() => null),
          },
          ObjectiveTemplate: {},
          ObjectiveTemplateFile: {
            findOrCreate: jest.fn(() => [
              {
                id: 1,
                objectiveTemplate: {
                  objectives: [
                    {
                      id: 1,
                    },
                  ],
                },
              },
              true,
            ]),
            update: objectiveTemplateFileUpdate,
          },
        },
      };

      const mockInstance = {
        objectiveId: 1,
        objective: {
          objectiveTemplateId: 1,
        },
        fileId: 1,
      };
      const mockOptions = {
        transaction: 'transaction',
      };

      await propagateCreateToTemplate(mockSequelize, mockInstance, mockOptions);
      expect(objectiveTemplateFileUpdate).not.toHaveBeenCalled();
    });
  });

  describe('checkForUseOnApprovedReport', () => {
    it('should throw an error if the file is used on an approved report', async () => {
      const mockSequelize = {
        models: {
          Objective: {
            findAll: jest.fn(() => [{ id: 1 }]),
          },
        },
      };

      const mockInstance = {
        objectiveTemplateId: 1,
      };

      const mockOptions = {
        transaction: 'transaction',
      };

      await expect(checkForUseOnApprovedReport(mockSequelize, mockInstance, mockOptions)).rejects.toThrow('File cannot be removed, used on approved report.');
    });
    it('should not throw an error if the file is not used on an approved report', async () => {
      const mockSequelize = {
        models: {
          Objective: {
            findAll: jest.fn(() => []),
          },
        },
      };

      const mockInstance = {
        objectiveTemplateId: 1,
      };

      const mockOptions = {
        transaction: 'transaction',
      };

      await expect(
        checkForUseOnApprovedReport(mockSequelize, mockInstance, mockOptions),
      ).resolves.toBeUndefined();
    });
  });

  describe('propagateDestroyToTemplate', () => {
    it('should call update on the objective template file if there are other objectives associated with the template', async () => {
      const objectiveTemplateFileUpdate = jest.fn();
      const mockSequelize = {
        models: {
          Objective: {
            findOne: jest.fn(() => ({
              id: 1,
              objectiveTemplate: {
                creationMethod: AUTOMATIC_CREATION,
              },
            })),
          },
          ObjectiveTemplate: {},
          ObjectiveTemplateFile: {
            findOne: jest.fn(() => ({
              id: 1,
              objectiveTemplate: {
                objectives: [
                  {
                    id: 1,
                  },
                  {
                    id: 2,
                  },
                ],
              },
            })),
            update: objectiveTemplateFileUpdate,
          },
        },
      };

      const mockInstance = {
        objectiveId: 1,
        objective: {
          objectiveTemplateId: 1,
        },
        fileId: 1,
      };
      const mockOptions = {
        transaction: 'transaction',
      };

      await propagateDestroyToTemplate(mockSequelize, mockInstance, mockOptions);
      expect(objectiveTemplateFileUpdate).toHaveBeenCalled();
    });
    it('should call destroy on the objective template file if there are no other objectives associated with the template', async () => {
      const objectiveTemplateFileDestroy = jest.fn();
      const mockSequelize = {
        models: {
          Objective: {
            findOne: jest.fn(() => ({
              id: 1,
              objectiveTemplate: {
                creationMethod: AUTOMATIC_CREATION,
              },
            })),
          },
          ObjectiveTemplate: {},
          ObjectiveTemplateFile: {
            findOne: jest.fn(() => ({
              id: 1,
              objectiveTemplate: {
                objectives: [],
              },
            })),
            destroy: objectiveTemplateFileDestroy,
          },
        },
      };

      const mockInstance = {
        objectiveId: 1,
        objective: {
          objectiveTemplateId: 1,
        },
        fileId: 1,
      };
      const mockOptions = {
        transaction: 'transaction',
      };

      await propagateDestroyToTemplate(mockSequelize, mockInstance, mockOptions);
      expect(objectiveTemplateFileDestroy).toHaveBeenCalled();
    });
  });
});
