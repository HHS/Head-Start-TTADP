import {
  sequelize,
} from '..';
import { AUTOMATIC_CREATION, CURATED_CREATION } from '../../constants';
import { beforeValidate, beforeUpdate } from './goalTemplate';

describe('GoalTemplate hooks', () => {
  describe('beforeUpdate', () => {
    it('calls autoPopulateHash and templateNameModifiedAt', async () => {
      const mockInstance = {
        changed: jest.fn(() => ['templateName']),
        templateName: 'test',
        set: jest.fn(),
      };
      const mockOptions = {
        fields: [],
      };
      beforeUpdate(sequelize, mockInstance, mockOptions);
      expect(mockInstance.set).toHaveBeenCalled();
      expect(mockOptions.fields).toStrictEqual(['hash', 'templateNameModifiedAt']);
    });
  });

  describe('beforeValidate', () => {
    describe('autoPopulateCreationMethod', () => {
      it('sets the creation method if the creation method is not set', async () => {
        const mockInstance = {
          creationMethod: null,
          changed: jest.fn(() => []),
          set: jest.fn(),
        };
        const mockOptions = {
          fields: [],
        };
        beforeValidate(sequelize, mockInstance, mockOptions);
        expect(mockInstance.set).toHaveBeenCalledWith('creationMethod', AUTOMATIC_CREATION);
        expect(mockOptions.fields).toEqual(['creationMethod']);
      });

      describe('not', () => {
        it('if "changed" is not an array', async () => {
          const mockInstance = {
            creationMethod: AUTOMATIC_CREATION,
            changed: jest.fn(() => null),
            set: jest.fn(),
          };
          const mockOptions = {
            fields: [],
          };
          beforeValidate(sequelize, mockInstance, mockOptions);
          expect(mockInstance.creationMethod).toEqual(AUTOMATIC_CREATION);
          expect(mockOptions.fields).toEqual([]);
        });

        it('if changed includes creation method', async () => {
          const mockInstance = {
            creationMethod: null,
            changed: jest.fn(() => ['creationMethod']),
            set: jest.fn(),
          };
          const mockOptions = {
            fields: [],
          };
          beforeValidate(sequelize, mockInstance, mockOptions);
          expect(mockInstance.creationMethod).toEqual(null);
          expect(mockOptions.fields).toEqual(['creationMethod']);
        });

        it('if creation method is already set', async () => {
          const mockInstance = {
            creationMethod: CURATED_CREATION,
            changed: jest.fn(() => ['creationMethod']),
            set: jest.fn(),
          };
          const mockOptions = {
            fields: [],
          };
          beforeValidate(sequelize, mockInstance, mockOptions);
          expect(mockInstance.creationMethod).toEqual(CURATED_CREATION);
          expect(mockOptions.fields).toEqual([]);
        });
      });

      describe('autoPopulateHash', () => {
        it('if the hash is not set', async () => {
          const mockInstance = {
            changed: jest.fn(() => ['templateName']),
            templateName: 'test',
            hash: '',
            set: jest.fn(),
          };
          const mockOptions = {
            fields: [],
          };
          beforeValidate(sequelize, mockInstance, mockOptions);
          expect(mockOptions.fields).toStrictEqual([
            'hash',
            'templateNameModifiedAt',
            'creationMethod',
          ]);
        });

        describe('not', () => {
          it('if "changed" is not an array', async () => {
            const mockInstance = {
              changed: jest.fn(() => null),
              templateName: 'test',
              hash: '',
            };
            const mockOptions = {
              fields: [],
            };
            beforeValidate(sequelize, mockInstance, mockOptions);
            expect(mockOptions.fields).toStrictEqual([]);
          });

          it('if changed does not include template name', async () => {
            const mockInstance = {
              changed: jest.fn(() => []),
              templateName: 'test',
              hash: '',
              set: jest.fn(),
            };
            const mockOptions = {
              fields: [],
            };
            beforeValidate(sequelize, mockInstance, mockOptions);
            expect(mockOptions.fields).toStrictEqual(['creationMethod']);
          });
        });
      });

      describe('autoPopulateTemplatenameModifiedAt', () => {
        it('if the hash is not set', async () => {
          const mockInstance = {
            changed: jest.fn(() => ['templateName']),
            templateName: 'test',
            templateNameModifiedAt: '',
            set: jest.fn(),
          };
          const mockOptions = {
            fields: [],
          };
          beforeValidate(sequelize, mockInstance, mockOptions);
          expect(mockOptions.fields).toStrictEqual(['hash', 'templateNameModifiedAt', 'creationMethod']);
        });

        describe('not', () => {
          it('if "changed" is not an array', async () => {
            const mockInstance = {
              changed: jest.fn(() => null),
              templateName: 'test',
              templateNameModifiedAt: '',
            };
            const mockOptions = {
              fields: [],
            };
            beforeValidate(sequelize, mockInstance, mockOptions);
            expect(mockOptions.fields).toStrictEqual([]);
          });

          it('if changed does not include template name', async () => {
            const mockInstance = {
              changed: jest.fn(() => []),
              templateName: 'test',
              templateNameModifiedAt: '',
              set: jest.fn(),
            };
            const mockOptions = {
              fields: [],
            };
            beforeValidate(sequelize, mockInstance, mockOptions);
            expect(mockOptions.fields).toStrictEqual(['creationMethod']);
          });
        });
      });
    });
  });
});
