import { AUTOMATIC_CREATION, CURATED_CREATION } from '../../constants';
import {
  afterCreate,
  beforeDestroy,
  afterDestroy,
} from './objectiveFile';
import { propagateDestroyToFile } from './genericFile';

jest.mock('./genericFile', () => ({
  propagateDestroyToFile: jest.fn(),
}));

describe('ObjectiveFile hooks', () => {
  describe('afterCreate', () => {
    it('should propagateCreateToTemplate', async () => {
      const otfUpdate = jest.fn();
      const otfCreate = jest.fn(() => ({
        id: 1,
      }));

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
          ObjectiveTemplateFile: {
            findOne: jest.fn(() => null),
            update: otfUpdate,
            create: otfCreate,
          },
        },
      };

      const mockInstance = {
        fileId: 1,
        objectiveId: 1,
      };

      const mockOptions = {
        transaction: 'transaction',
      };

      await afterCreate(mockSequelize, mockInstance, mockOptions);
      expect(otfCreate).toHaveBeenCalledWith({
        objectiveTemplateId: 1,
        fileId: 1,
      }, {
        transaction: 'transaction',
      });

      expect(otfUpdate).toHaveBeenCalledWith({
        updatedAt: expect.any(Date),
      }, {
        where: { id: 1 },
        transaction: 'transaction',
        individualHooks: true,
      });
    });
    it('updates if exists', async () => {
      const otfUpdate = jest.fn();
      const otfCreate = jest.fn(() => ({
        id: 1,
      }));

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
          ObjectiveTemplateFile: {
            findOne: jest.fn(() => ({
              id: 1,
            })),
            update: otfUpdate,
            create: otfCreate,
          },
        },
      };

      const mockInstance = {
        fileId: 1,
        objectiveId: 1,
      };

      const mockOptions = {
        transaction: 'transaction',
      };

      await afterCreate(mockSequelize, mockInstance, mockOptions);
      expect(otfCreate).not.toHaveBeenCalled();

      expect(otfUpdate).toHaveBeenCalledWith({
        updatedAt: expect.any(Date),
      }, {
        where: { id: 1 },
        transaction: 'transaction',
        individualHooks: true,
      });
    });

    describe('it doesn\'t create or update if', () => {
      it('the objective doesn\'t exist', async () => {
        const otfUpdate = jest.fn();
        const otfCreate = jest.fn(() => ({
          id: 1,
        }));

        const mockSequelize = {
          models: {
            Objective: {
              findOne: jest.fn(() => null),
            },
            ObjectiveTemplateFile: {
              findOne: jest.fn(() => null),
              update: otfUpdate,
              create: otfCreate,
            },
          },
        };

        const mockInstance = {
          fileId: 1,
          objectiveId: 1,
        };

        const mockOptions = {
          transaction: 'transaction',
        };

        await afterCreate(mockSequelize, mockInstance, mockOptions);
        expect(otfCreate).not.toHaveBeenCalled();

        expect(otfUpdate).not.toHaveBeenCalled();
      });

      it('the objective doesn\'t have a template', async () => {
        const otfUpdate = jest.fn();
        const otfCreate = jest.fn(() => ({
          id: 1,
        }));

        const mockSequelize = {
          models: {
            Objective: {
              findOne: jest.fn(() => ({
                objectiveTemplateId: null,
              })),
            },
            ObjectiveTemplateFile: {
              findOne: jest.fn(() => null),
              update: otfUpdate,
              create: otfCreate,
            },
          },
        };

        const mockInstance = {
          fileId: 1,
          objectiveId: 1,
        };

        const mockOptions = {
          transaction: 'transaction',
        };

        await afterCreate(mockSequelize, mockInstance, mockOptions);
        expect(otfCreate).not.toHaveBeenCalled();

        expect(otfUpdate).not.toHaveBeenCalled();
      });

      it('the objective template doesn\'t have automatic creation', async () => {
        const otfUpdate = jest.fn();
        const otfCreate = jest.fn(() => ({
          id: 1,
        }));

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
            ObjectiveTemplateFile: {
              findOne: jest.fn(() => null),
              update: otfUpdate,
              create: otfCreate,
            },
          },
        };

        const mockInstance = {
          fileId: 1,
          objectiveId: 1,
        };

        const mockOptions = {
          transaction: 'transaction',
        };

        await afterCreate(mockSequelize, mockInstance, mockOptions);
        expect(otfCreate).not.toHaveBeenCalled();

        expect(otfUpdate).not.toHaveBeenCalled();
      });
    });
  });

  describe('beforeDestroy', () => {
    it('throws an error if the objective is on an approved report', async () => {
      const mockSequelize = {
        models: {
          Objective: {
            findOne: jest.fn(() => ({
              onApprovedAR: true,
            })),
          },
        },
      };

      const mockInstance = {
        objectiveId: 1,
      };

      const mockOptions = {
        transaction: 'transaction',
      };

      await expect(beforeDestroy(mockSequelize, mockInstance, mockOptions)).rejects.toThrow('File cannot be removed, used on approved report.');
    });

    it('doesn\'t throw an error if the objective is not on an approved report', async () => {
      const mockSequelize = {
        models: {
          Objective: {
            findOne: jest.fn(() => ({
              onApprovedAR: false,
            })),
          },
        },
      };

      const mockInstance = {
        objectiveId: 1,
      };

      const mockOptions = {
        transaction: 'transaction',
      };

      await expect(beforeDestroy(mockSequelize, mockInstance, mockOptions))
        .resolves.toBeUndefined();
    });
  });

  describe('afterDestroy', () => {
    it('will call propagateDestroyToFile', async () => {
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
          ObjectiveTemplateFile: {
            findOne: jest.fn(() => ({
              id: 1,
              objectiveTemplate: {
                objectives: [],
              },
            })),
            update: jest.fn(),
            destroy: jest.fn(),
          },
        },
      };

      const mockInstance = {
        objectiveId: 1,
      };

      const mockOptions = {
        transaction: 'transaction',
      };

      await afterDestroy(mockSequelize, mockInstance, mockOptions);

      expect(propagateDestroyToFile)
        .toHaveBeenCalledWith(mockSequelize, mockInstance, mockOptions);
    });

    it('should propagate delete to template', async () => {
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
          ObjectiveTemplateFile: {
            findOne: jest.fn(() => ({
              id: 1,
              objectiveTemplate: {
                objectives: [],
              },
            })),
            update: jest.fn(),
            destroy: jest.fn(),
          },
        },
      };

      const mockInstance = {
        objectiveId: 1,
      };

      const mockOptions = {
        transaction: 'transaction',
      };

      await afterDestroy(mockSequelize, mockInstance, mockOptions);

      expect(mockSequelize.models.ObjectiveTemplateFile.destroy).toHaveBeenCalledWith({
        where: { id: 1 },
        transaction: 'transaction',
      });
    });

    it('should propagate update to template', async () => {
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
          ObjectiveTemplateFile: {
            findOne: jest.fn(() => ({
              id: 1,
              objectiveTemplate: {
                objectives: [{}],
              },
            })),
            update: jest.fn(),
            destroy: jest.fn(),
          },
        },
      };

      const mockInstance = {
        objectiveId: 1,
      };

      const mockOptions = {
        transaction: 'transaction',
      };

      await afterDestroy(mockSequelize, mockInstance, mockOptions);

      expect(mockSequelize.models.ObjectiveTemplateFile.update).toHaveBeenCalledWith(
        { updatedAt: expect.any(Date) },
        { where: { id: 1 }, transaction: 'transaction', individualHooks: true },
      );

      expect(mockSequelize.models.ObjectiveTemplateFile.destroy).not.toHaveBeenCalled();
    });

    describe('it doesn\'t create or update if', () => {
      it('the objective template doesn\'t have automatic creation', async () => {
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
            ObjectiveTemplateFile: {
              findOne: jest.fn(() => null),
              update: jest.fn(),
              create: jest.fn(),
            },
          },
        };

        const mockInstance = {
          objectiveId: 1,
        };

        const mockOptions = {
          transaction: 'transaction',
        };

        await afterDestroy(mockSequelize, mockInstance, mockOptions);
        expect(mockSequelize.models.ObjectiveTemplateFile.create).not.toHaveBeenCalled();

        expect(mockSequelize.models.ObjectiveTemplateFile.update).not.toHaveBeenCalled();
      });

      it('the objective doesn\'t exist', async () => {
        const mockSequelize = {
          models: {
            Objective: {
              findOne: jest.fn(() => null),
            },
            ObjectiveTemplateFile: {
              findOne: jest.fn(() => null),
              update: jest.fn(),
              create: jest.fn(),
            },
          },
        };

        const mockInstance = {
          objectiveId: 1,
        };

        const mockOptions = {
          transaction: 'transaction',
        };

        await afterDestroy(mockSequelize, mockInstance, mockOptions);
        expect(mockSequelize.models.ObjectiveTemplateFile.create).not.toHaveBeenCalled();

        expect(mockSequelize.models.ObjectiveTemplateFile.update).not.toHaveBeenCalled();
      });

      it('the objective template doesn\'t exist', async () => {
        const mockSequelize = {
          models: {
            Objective: {
              findOne: jest.fn(() => ({
                objectiveTemplateId: null,
              })),
            },
            ObjectiveTemplateFile: {
              findOne: jest.fn(() => null),
              update: jest.fn(),
              create: jest.fn(),
            },
          },
        };

        const mockInstance = {
          objectiveId: 1,
        };

        const mockOptions = {
          transaction: 'transaction',
        };

        await afterDestroy(mockSequelize, mockInstance, mockOptions);
        expect(mockSequelize.models.ObjectiveTemplateFile.create).not.toHaveBeenCalled();

        expect(mockSequelize.models.ObjectiveTemplateFile.update).not.toHaveBeenCalled();
      });
    });
  });
});
