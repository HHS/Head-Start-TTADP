// 12,25,36-38,44-48,72-73,77
import {
  sequelize,
  User,
  ActivityReport,
} from '..';
import { AUTOMATIC_CREATION, CURATED_CREATION } from '../../constants';

import { beforeValidate, beforeUpdate, afterUpdate } from './goalTemplate';

describe('GoalTemplate hooks', () => {
  describe('beforeUpdate', () => {
    it('calls autoPopulateHash', async () => {
      const mockInstance = {
        changed: [],
      };
      const mockOptions = {
        fields: [],
      };
      beforeUpdate(sequelize, mockInstance, mockOptions);
      expect(mockOptions.fields).toStrictEqual(['hash']);
    });

    it('calls autoPopulateTemplateNameModifiedAt', async () => {
      const mockInstance = {
        changed: [],
      };
      const mockOptions = {
        fields: [],
      };
      beforeUpdate(sequelize, mockInstance, mockOptions);
      expect(mockOptions.fields).toStrictEqual(['templateNameModifiedAt']);
    });
  });

  describe('beforeValidate', () => {
    describe('autoPopulateCreationMethod', () => {
      it('sets the creation method if the creation method is not set', async () => {
        const mockInstance = {
          creationMethod: null,
          changed: [],
        };
        const mockOptions = {
          fields: [],
        };
        beforeValidate(sequelize, mockInstance, mockOptions);
        expect(mockInstance.creationMethod).toEqual(AUTOMATIC_CREATION);
        expect(mockOptions.fields).toEqual(['creationMethod']);
      });

      describe('not', () => {
        it('if "changed" is not an array', async () => {
          const mockInstance = {
            creationMethod: null,
            changed: null,
          };
          const mockOptions = {
            fields: [],
          };
          beforeValidate(sequelize, mockInstance, mockOptions);
          expect(mockInstance.creationMethod).toEqual(null);
          expect(mockOptions.fields).toEqual([]);
        });

        it('if changed includes creation method', async () => {
          const mockInstance = {
            creationMethod: null,
            changed: ['creationMethod'],
          };
          const mockOptions = {
            fields: [],
          };
          beforeValidate(sequelize, mockInstance, mockOptions);
          expect(mockInstance.creationMethod).toEqual(null);
          expect(mockOptions.fields).toEqual([]);
        });

        it('if creation method is already set', async () => {
          const mockInstance = {
            creationMethod: 'Manual',
            changed: [],
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
            changed: ['templateName'],
            templateName: 'test',
            hash: '',
          };
          const mockOptions = {
            fields: [],
          };
          beforeValidate(sequelize, mockInstance, mockOptions);
          expect(mockOptions.fields).toStrictEqual(['hash']);
        });

        describe('not', () => {
          it('if "changed" is not an array', async () => {
            const mockInstance = {
              changed: null,
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
              changed: ['other'],
              templateName: 'test',
              hash: '',
            };
            const mockOptions = {
              fields: [],
            };
            beforeValidate(sequelize, mockInstance, mockOptions);
            expect(mockOptions.fields).toStrictEqual([]);
          });
        });
      });

      describe('autoPopulateTemplatenameModifiedAt', () => {
        it('if the hash is not set', async () => {
          const mockInstance = {
            changed: ['templateName'],
            templateName: 'test',
            templateNameModifiedAt: '',
          };
          const mockOptions = {
            fields: [],
          };
          beforeValidate(sequelize, mockInstance, mockOptions);
          expect(mockOptions.fields).toStrictEqual(['templateNameModifiedAt']);
        });

        describe('not', () => {
          it('if "changed" is not an array', async () => {
            const mockInstance = {
              changed: null,
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
              changed: ['other'],
              templateName: 'test',
              templateNameModifiedAt: '',
            };
            const mockOptions = {
              fields: [],
            };
            beforeValidate(sequelize, mockInstance, mockOptions);
            expect(mockOptions.fields).toStrictEqual([]);
          });
        });
      });
    });
  });
});
