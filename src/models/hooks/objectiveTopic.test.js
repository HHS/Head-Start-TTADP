import { AUTOMATIC_CREATION, CURATED_CREATION } from '../../constants';
import { afterCreate, afterDestroy } from './objectiveTopic';

describe('ObjectiveTopic hooks', () => {
  describe('afterCreate', () => {
    it('should propagate create to template', async () => {
      const objectiveTemplateTopicUpdate = jest.fn();
      const mockSequelize = {
        models: {
          Objective: {
            findOne: jest.fn(() => ({
              objectiveTemplateId: 1,
              objectiveTemplate: {
                creationMethod: AUTOMATIC_CREATION,
              },
            })),
          },
          ObjectiveTemplate: {},
          ObjectiveTemplateTopic: {
            findOrCreate: jest.fn(() => [{ id: 1 }]),
            update: objectiveTemplateTopicUpdate,
          },
        },
      };

      const mockInstance = {
        objectiveId: 1,
        topicId: 1,
      };

      const mockOptions = { transaction: {} };
      await afterCreate(mockSequelize, mockInstance, mockOptions);

      expect(objectiveTemplateTopicUpdate).toHaveBeenCalledWith(
        {
          updatedAt: expect.any(Date),
        },
        {
          where: { id: 1 },
          transaction: mockOptions.transaction,
          individualHooks: true,
        },
      );
    });

    describe('it shouldnt propagate create', () => {
      it('if the objective doesn\'t exist', async () => {
        const objectiveTemplateTopicUpdate = jest.fn();
        const mockSequelize = {
          models: {
            Objective: {
              findOne: jest.fn(() => null),
            },
            ObjectiveTemplate: {},
            ObjectiveTemplateTopic: {
              findOrCreate: jest.fn(() => [{ id: 1 }]),
              update: objectiveTemplateTopicUpdate,
            },
          },
        };

        const mockInstance = {
          objectiveId: 1,
          topicId: 1,
        };

        const mockOptions = { transaction: {} };
        await afterCreate(mockSequelize, mockInstance, mockOptions);
        expect(objectiveTemplateTopicUpdate).not.toHaveBeenCalled();
      });

      it('if the objective template is null', async () => {
        const objectiveTemplateTopicUpdate = jest.fn();
        const mockSequelize = {
          models: {
            Objective: {
              findOne: jest.fn(() => ({
                objectiveTemplateId: null,
                objectiveTemplate: {
                  creationMethod: AUTOMATIC_CREATION,
                },
              })),
            },
            ObjectiveTemplate: {},
            ObjectiveTemplateTopic: {
              findOrCreate: jest.fn(() => [{ id: 1 }]),
              update: objectiveTemplateTopicUpdate,
            },
          },
        };

        const mockInstance = {
          objectiveId: 1,
          topicId: 1,
        };

        const mockOptions = { transaction: {} };
        await afterCreate(mockSequelize, mockInstance, mockOptions);
        expect(objectiveTemplateTopicUpdate).not.toHaveBeenCalled();
      });

      it('if the objective template creation method is not automatic', async () => {
        const objectiveTemplateTopicUpdate = jest.fn();
        const mockSequelize = {
          models: {
            Objective: {
              findOne: jest.fn(() => ({
                objectiveTemplateId: 1,
                objectiveTemplate: {
                  creationMethod: CURATED_CREATION,
                },
              })),
            },
            ObjectiveTemplate: {},
            ObjectiveTemplateTopic: {
              findOrCreate: jest.fn(() => [{ id: 1 }]),
              update: objectiveTemplateTopicUpdate,
            },
          },
        };

        const mockInstance = {
          objectiveId: 1,
          topicId: 1,
        };

        const mockOptions = { transaction: {} };
        await afterCreate(mockSequelize, mockInstance, mockOptions);
        expect(objectiveTemplateTopicUpdate).not.toHaveBeenCalled();
      });
    });
  });

  describe('afterDestroy', () => {
    it('should propagate destroy to template', async () => {
      const objectiveTemplateTopicDestroy = jest.fn();
      const mockSequelize = {
        models: {
          Objective: {
            findOne: jest.fn(() => ({
              objectiveTemplateId: 1,
              objectiveTemplate: {
                creationMethod: AUTOMATIC_CREATION,
              },
            })),
          },
          ObjectiveTemplate: {},
          ObjectiveTemplateTopic: {
            destroy: objectiveTemplateTopicDestroy,
            findOne: jest.fn(() => ({
              id: 1,
              objectiveTemplate: {
                objectives: [],
              },
            })),
            update: jest.fn(),
          },

        },
      };

      const mockInstance = {
        objectiveId: 1,
        topicId: 1,
      };

      const mockOptions = { transaction: {} };

      await afterDestroy(mockSequelize, mockInstance, mockOptions);
      expect(objectiveTemplateTopicDestroy).toHaveBeenCalledWith({
        where: { id: 1 },
        transaction: mockOptions.transaction,
      });
    });

    it('should update OTT where appropriate', async () => {
      const objectiveTemplateTopicUpdate = jest.fn();
      const mockSequelize = {
        models: {
          Objective: {
            findOne: jest.fn(() => ({
              objectiveTemplateId: 1,
              objectiveTemplate: {
                creationMethod: AUTOMATIC_CREATION,
              },
            })),
          },
          ObjectiveTemplate: {},
          ObjectiveTemplateTopic: {
            destroy: jest.fn(),
            findOne: jest.fn(() => ({
              id: 1,
              objectiveTemplate: {
                objectives: [{}],
              },
            })),
            update: objectiveTemplateTopicUpdate,
          },

        },
      };

      const mockInstance = {
        objectiveId: 1,
        topicId: 1,
      };

      const mockOptions = { transaction: {} };

      await afterDestroy(mockSequelize, mockInstance, mockOptions);
      expect(objectiveTemplateTopicUpdate).toHaveBeenCalledWith(
        {
          updatedAt: expect.any(Date),
        },
        {
          where: { id: 1 },
          transaction: mockOptions.transaction,
          individualHooks: true,
        },
      );
    });

    describe('it shouldnt propagate destroy', () => {
      it('if the objective doesn\'t exist', async () => {
        const objectiveTemplateTopicDestroy = jest.fn();
        const mockSequelize = {
          models: {
            Objective: {
              findOne: jest.fn(() => null),
            },
            ObjectiveTemplate: {},
            ObjectiveTemplateTopic: {
              destroy: objectiveTemplateTopicDestroy,
              findOne: jest.fn(() => ({
                id: 1,
                objectiveTemplate: {
                  objectives: [],
                },
              })),
              update: jest.fn(),
            },

          },
        };

        const mockInstance = {
          objectiveId: 1,
          topicId: 1,
        };

        const mockOptions = { transaction: {} };

        await afterDestroy(mockSequelize, mockInstance, mockOptions);
        expect(objectiveTemplateTopicDestroy).not.toHaveBeenCalled();
      });

      it('if the objective template is null', async () => {
        const objectiveTemplateTopicDestroy = jest.fn();
        const mockSequelize = {
          models: {
            Objective: {
              findOne: jest.fn(() => ({
                objectiveTemplateId: null,
                objectiveTemplate: {
                  creationMethod: AUTOMATIC_CREATION,
                },
              })),
            },
            ObjectiveTemplate: {},
            ObjectiveTemplateTopic: {
              destroy: objectiveTemplateTopicDestroy,
              findOne: jest.fn(() => ({
                id: 1,
                objectiveTemplate: {
                  objectives: [],
                },
              })),
              update: jest.fn(),
            },

          },
        };

        const mockInstance = {
          objectiveId: 1,
          topicId: 1,
        };

        const mockOptions = { transaction: {} };

        await afterDestroy(mockSequelize, mockInstance, mockOptions);
        expect(objectiveTemplateTopicDestroy).not.toHaveBeenCalled();
      });

      it('if the objective template creation method is not automatic', async () => {
        const objectiveTemplateTopicDestroy = jest.fn();
        const mockSequelize = {
          models: {
            Objective: {
              findOne: jest.fn(() => ({
                objectiveTemplateId: 1,
                objectiveTemplate: {
                  creationMethod: CURATED_CREATION,
                },
              })),
            },
            ObjectiveTemplate: {},
            ObjectiveTemplateTopic: {
              destroy: objectiveTemplateTopicDestroy,
              findOne: jest.fn(() => ({
                id: 1,
                objectiveTemplate: {
                  objectives: [],
                },
              })),
              update: jest.fn(),
            },

          },
        };

        const mockInstance = {
          objectiveId: 1,
          topicId: 1,
        };

        const mockOptions = { transaction: {} };

        await afterDestroy(mockSequelize, mockInstance, mockOptions);
        expect(objectiveTemplateTopicDestroy).not.toHaveBeenCalled();
      });
    });
  });
});
