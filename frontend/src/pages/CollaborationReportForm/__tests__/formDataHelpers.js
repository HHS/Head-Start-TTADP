import {
  findWhatsChanged,
  unflattenResourcesUsed,
  convertReportToFormData,
} from '../formDataHelpers';

describe('formDataHelpers', () => {
  describe('findWhatsChanged', () => {
    it('should return empty object when objects are identical', () => {
      const object = { name: 'test', value: 123 };
      const base = { name: 'test', value: 123 };

      const result = findWhatsChanged(object, base);
      expect(result).toEqual({});
    });

    it('should return changed values', () => {
      const object = { name: 'updated', value: 456, newField: 'added' };
      const base = { name: 'test', value: 123 };

      const result = findWhatsChanged(object, base);
      expect(result).toEqual({
        name: 'updated',
        newField: 'added',
        value: 456,
      });
    });

    it('should handle startDate validation', () => {
      const object = {
        startDate: '01/15/2024',
        name: 'test',
      };
      const base = {
        startDate: '01/10/2024',
        name: 'test',
      };

      const result = findWhatsChanged(object, base);
      expect(result).toEqual({
        startDate: '01/15/2024',
      });
    });

    it('should remove invalid startDate', () => {
      const object = {
        startDate: 'invalid-date',
        name: 'changed',
      };
      const base = {
        startDate: '01/10/2024',
        name: 'test',
      };

      const result = findWhatsChanged(object, base);
      expect(result).toEqual({
        name: 'changed',
      });
      expect(result.startDate).toBeUndefined();
    });

    it('should remove empty startDate', () => {
      const object = {
        startDate: '',
        name: 'changed',
      };
      const base = {
        startDate: '01/10/2024',
        name: 'test',
      };

      const result = findWhatsChanged(object, base);
      expect(result).toEqual({
        name: 'changed',
      });
      expect(result.startDate).toBeUndefined();
    });

    it('should handle endDate validation', () => {
      const object = {
        endDate: '01/20/2024',
        name: 'test',
      };
      const base = {
        endDate: '01/15/2024',
        name: 'test',
      };

      const result = findWhatsChanged(object, base);
      expect(result).toEqual({
        endDate: '01/20/2024',
      });
    });

    it('should remove invalid endDate', () => {
      const object = {
        endDate: 'invalid-date',
        name: 'changed',
      };
      const base = {
        endDate: '01/15/2024',
        name: 'test',
      };

      const result = findWhatsChanged(object, base);
      expect(result).toEqual({
        name: 'changed',
      });
      expect(result.endDate).toBeUndefined();
    });

    it('should handle creatorRole when empty', () => {
      const object = {
        creatorRole: '',
        name: 'test',
      };
      const base = {
        creatorRole: 'Health Specialist',
        name: 'test',
      };

      const result = findWhatsChanged(object, base);
      expect(result).toEqual({
        creatorRole: null,
      });
    });

    it('should handle creatorRole when null', () => {
      const object = {
        creatorRole: null,
        name: 'test',
      };
      const base = {
        creatorRole: 'Health Specialist',
        name: 'test',
      };

      const result = findWhatsChanged(object, base);
      expect(result).toEqual({
        creatorRole: null,
      });
    });

    it('should handle creatorRole with value', () => {
      const object = {
        creatorRole: 'Education Specialist',
        name: 'test',
      };
      const base = {
        creatorRole: 'Health Specialist',
        name: 'test',
      };

      const result = findWhatsChanged(object, base);
      expect(result).toEqual({
        creatorRole: 'Education Specialist',
      });
    });

    it('should remove NaN values', () => {
      const object = {
        validNumber: 123,
        invalidNumber: NaN,
        name: 'test',
      };
      const base = {
        validNumber: 456,
        invalidNumber: 789,
        name: 'test',
      };

      const result = findWhatsChanged(object, base);
      expect(result).toEqual({
        validNumber: 123,
      });
      expect(result.invalidNumber).toBeUndefined();
    });

    it('should sort keys consistently', () => {
      const object = {
        zebra: 'changed',
        alpha: 'changed',
        beta: 'changed',
      };
      const base = {
        zebra: 'original',
        alpha: 'original',
        beta: 'original',
      };

      const result = findWhatsChanged(object, base);
      const keys = Object.keys(result);
      expect(keys).toEqual(['alpha', 'beta', 'zebra']);
    });

    it('should handle complex nested objects', () => {
      const object = {
        simple: 'changed',
        nested: { id: 1, name: 'updated' },
        array: [1, 2, 3],
      };
      const base = {
        simple: 'original',
        nested: { id: 1, name: 'original' },
        array: [1, 2],
      };

      const result = findWhatsChanged(object, base);
      expect(result).toEqual({
        array: [1, 2, 3],
        nested: { id: 1, name: 'updated' },
        simple: 'changed',
      });
    });
  });

  describe('unflattenResourcesUsed', () => {
    it('should convert array of values to array of objects', () => {
      const input = ['resource1', 'resource2', 'resource3'];
      const result = unflattenResourcesUsed(input);

      expect(result).toEqual([
        { value: 'resource1' },
        { value: 'resource2' },
        { value: 'resource3' },
      ]);
    });

    it('should handle empty array', () => {
      const input = [];
      const result = unflattenResourcesUsed(input);

      expect(result).toEqual([]);
    });

    it('should handle null input', () => {
      const input = null;
      const result = unflattenResourcesUsed(input);

      expect(result).toEqual([]);
    });

    it('should handle undefined input', () => {
      const input = undefined;
      const result = unflattenResourcesUsed(input);

      expect(result).toEqual([]);
    });

    it('should handle mixed data types', () => {
      const input = ['string', 123, true, null];
      const result = unflattenResourcesUsed(input);

      expect(result).toEqual([
        { value: 'string' },
        { value: 123 },
        { value: true },
        { value: null },
      ]);
    });
  });

  describe('convertReportToFormData', () => {
    it('should preserve all other fields', () => {
      const fetchedReport = {
        id: 1,
        title: 'Test Report',
        startDate: '01/15/2024',
        endDate: '01/20/2024',
        status: 'draft',
        collabReportCollaborators: [
          {
            id: 1,
            specialistId: 5,
            specialist:
            {
              id: 5, fullName: 'John Doe',
            },
          },
        ],
        approvers: [{ id: 2, name: 'Jane Smith' }],
        additionalData: { notes: 'Important notes' },
        calculatedStatus: 'submitted',
        isStateActivity: true,
        regionId: 1,
      };

      const result = convertReportToFormData(fetchedReport);

      expect(result).toEqual({
        id: 1,
        title: 'Test Report',
        startDate: '01/15/2024',
        endDate: '01/20/2024',
        status: 'draft',
        collabReportCollaborators: [{ value: 5, name: 'John Doe' }],
        reportReasons: [],
        isStateActivity: 'true',
        approvers: [{ id: 2, name: 'Jane Smith' }],
        additionalData: { notes: 'Important notes' },
        calculatedStatus: 'submitted',
        regionId: 1,
      });
    });
  });
});
