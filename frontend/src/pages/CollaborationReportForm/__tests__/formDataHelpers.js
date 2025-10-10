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
    it('should handle report with undefined dates', () => {
      const fetchedReport = {
        id: 1,
        title: 'Test Report',
        status: 'draft',
      };

      const result = convertReportToFormData(fetchedReport);

      expect(result).toEqual(expect.objectContaining({
        id: 1,
        title: 'Test Report',
        status: 'draft',
      }));
    });

    it('should handle report with empty string dates', () => {
      const fetchedReport = {
        id: 1,
        title: 'Test Report',
        startDate: '',
        endDate: '',
        status: 'draft',
      };

      const result = convertReportToFormData(fetchedReport);

      expect(result).toEqual(expect.objectContaining({
        id: 1,
        title: 'Test Report',
        status: 'draft',
      }));
    });

    it('should preserve all other fields', () => {
      const fetchedReport = {
        id: 1,
        title: 'Test Report',
        startDate: '2024-01-15',
        endDate: '2024-01-20',
        status: 'draft',
        approvers: [{ id: 2, name: 'Jane Smith' }],
        additionalData: { notes: 'Important notes' },
        collabReportSpecialists: [{ id: 5, name: 'John Doe', specialist: { id: 1, fullName: 'John Doe, Specialist' } }],
        calculatedStatus: 'submitted',
        isStateActivity: true,
        regionId: 1,
      };

      const result = convertReportToFormData(fetchedReport);

      expect(result).toEqual(expect.objectContaining({
        id: 1,
        title: 'Test Report',
        startDate: '2024-01-15',
        endDate: '2024-01-20',
        status: 'draft',
        collabReportSpecialists: fetchedReport.collabReportSpecialists,
        reportReasons: [],
        isStateActivity: 'true',
        approvers: [{ id: 2, name: 'Jane Smith' }],
        additionalData: { notes: 'Important notes' },
        calculatedStatus: 'submitted',
        regionId: 1,
      }));
    });

    describe('isStateActivity conversion', () => {
      it('should convert isStateActivity true to string "true"', () => {
        const fetchedReport = {
          id: 1,
          title: 'Test Report',
          isStateActivity: true,
        };

        const result = convertReportToFormData(fetchedReport);

        expect(result.isStateActivity).toBe('true');
      });

      it('should convert isStateActivity false to string "false"', () => {
        const fetchedReport = {
          id: 1,
          title: 'Test Report',
          isStateActivity: false,
        };

        const result = convertReportToFormData(fetchedReport);

        expect(result.isStateActivity).toBe('false');
      });

      it('should set isStateActivity to null when undefined', () => {
        const fetchedReport = {
          id: 1,
          title: 'Test Report',
          isStateActivity: undefined,
        };

        const result = convertReportToFormData(fetchedReport);

        expect(result.isStateActivity).toBe(null);
      });

      it('should set isStateActivity to null when null', () => {
        const fetchedReport = {
          id: 1,
          title: 'Test Report',
          isStateActivity: null,
        };

        const result = convertReportToFormData(fetchedReport);

        expect(result.isStateActivity).toBe(null);
      });

      it('should set isStateActivity to null when not present', () => {
        const fetchedReport = {
          id: 1,
          title: 'Test Report',
        };

        const result = convertReportToFormData(fetchedReport);

        expect(result.isStateActivity).toBe(null);
      });
    });

    describe('hasDataUsed conversion', () => {
      it('should convert hasDataUsed true to string "true"', () => {
        const fetchedReport = {
          id: 1,
          hasDataUsed: true,
        };

        const result = convertReportToFormData(fetchedReport);

        expect(result.hasDataUsed).toBe('true');
      });

      it('should convert hasDataUsed false to string "false"', () => {
        const fetchedReport = {
          id: 1,
          hasDataUsed: false,
        };

        const result = convertReportToFormData(fetchedReport);

        expect(result.hasDataUsed).toBe('false');
      });

      it('should set hasDataUsed to null when undefined', () => {
        const fetchedReport = {
          id: 1,
          hasDataUsed: undefined,
        };

        const result = convertReportToFormData(fetchedReport);

        expect(result.hasDataUsed).toBe(null);
      });

      it('should set hasDataUsed to null when null', () => {
        const fetchedReport = {
          id: 1,
          hasDataUsed: null,
        };

        const result = convertReportToFormData(fetchedReport);

        expect(result.hasDataUsed).toBe(null);
      });
    });

    describe('hasGoals conversion', () => {
      it('should convert hasGoals true to string "true"', () => {
        const fetchedReport = {
          id: 1,
          hasGoals: true,
        };

        const result = convertReportToFormData(fetchedReport);

        expect(result.hasGoals).toBe('true');
      });

      it('should convert hasGoals false to string "false"', () => {
        const fetchedReport = {
          id: 1,
          hasGoals: false,
        };

        const result = convertReportToFormData(fetchedReport);

        expect(result.hasGoals).toBe('false');
      });

      it('should set hasGoals to null when undefined', () => {
        const fetchedReport = {
          id: 1,
          hasGoals: undefined,
        };

        const result = convertReportToFormData(fetchedReport);

        expect(result.hasGoals).toBe(null);
      });

      it('should set hasGoals to null when null', () => {
        const fetchedReport = {
          id: 1,
          hasGoals: null,
        };

        const result = convertReportToFormData(fetchedReport);

        expect(result.hasGoals).toBe(null);
      });
    });

    describe('participants conversion', () => {
      it('should convert participants array to label/value format', () => {
        const fetchedReport = {
          id: 1,
          participants: ['John Doe', 'Jane Smith', 'Bob Johnson'],
        };

        const result = convertReportToFormData(fetchedReport);

        expect(result.participants).toEqual([
          { label: 'John Doe', value: 'John Doe' },
          { label: 'Jane Smith', value: 'Jane Smith' },
          { label: 'Bob Johnson', value: 'Bob Johnson' },
        ]);
      });

      it('should return empty array when participants is null', () => {
        const fetchedReport = {
          id: 1,
          participants: null,
        };

        const result = convertReportToFormData(fetchedReport);

        expect(result.participants).toEqual([]);
      });

      it('should return empty array when participants is undefined', () => {
        const fetchedReport = {
          id: 1,
        };

        const result = convertReportToFormData(fetchedReport);

        expect(result.participants).toEqual([]);
      });
    });

    describe('dataUsed conversion', () => {
      it('should convert dataUsed array to label/value format', () => {
        const fetchedReport = {
          id: 1,
          dataUsed: [
            { collabReportDatum: 'data1' },
            { collabReportDatum: 'data2' },
          ],
        };

        const result = convertReportToFormData(fetchedReport);

        expect(result.dataUsed).toEqual([
          { label: undefined, value: 'data1' },
          { label: undefined, value: 'data2' },
        ]);
      });

      it('should return empty array when dataUsed is null', () => {
        const fetchedReport = {
          id: 1,
          dataUsed: null,
        };

        const result = convertReportToFormData(fetchedReport);

        expect(result.dataUsed).toEqual([]);
      });

      it('should return empty array when dataUsed is undefined', () => {
        const fetchedReport = {
          id: 1,
        };

        const result = convertReportToFormData(fetchedReport);

        expect(result.dataUsed).toEqual([]);
      });
    });

    describe('reportGoals conversion', () => {
      it('should convert reportGoals to label/value format', () => {
        const fetchedReport = {
          id: 1,
          reportGoals: [
            { goalTemplateId: 1, goalTemplate: { standard: 'Goal 1' } },
            { goalTemplateId: 2, goalTemplate: { standard: 'Goal 2' } },
          ],
        };

        const result = convertReportToFormData(fetchedReport);

        expect(result.goals).toEqual([
          { label: 'Goal 1', value: 1 },
          { label: 'Goal 2', value: 2 },
        ]);
      });

      it('should return empty array when reportGoals is null', () => {
        const fetchedReport = {
          id: 1,
          reportGoals: null,
        };

        const result = convertReportToFormData(fetchedReport);

        expect(result.goals).toEqual([]);
      });

      it('should return empty array when reportGoals is undefined', () => {
        const fetchedReport = {
          id: 1,
        };

        const result = convertReportToFormData(fetchedReport);

        expect(result.goals).toEqual([]);
      });
    });

    describe('statesInvolved conversion', () => {
      it('should convert statesInvolved to label/value format', () => {
        const fetchedReport = {
          id: 1,
          statesInvolved: ['AL', 'AK'],
        };

        const result = convertReportToFormData(fetchedReport);

        expect(result.statesInvolved).toEqual([
          { label: 'Alabama', value: 'AL' },
          { label: 'Alaska', value: 'AK' },
        ]);
      });

      it('should return empty array when statesInvolved is null', () => {
        const fetchedReport = {
          id: 1,
          statesInvolved: null,
        };

        const result = convertReportToFormData(fetchedReport);

        expect(result.statesInvolved).toEqual([]);
      });

      it('should return empty array when statesInvolved is undefined', () => {
        const fetchedReport = {
          id: 1,
        };

        const result = convertReportToFormData(fetchedReport);

        expect(result.statesInvolved).toEqual([]);
      });
    });

    describe('conductMethod conversion', () => {
      it('should convert conductMethod to label/value format', () => {
        const fetchedReport = {
          id: 1,
          conductMethod: ['email', 'virtual'],
        };

        const result = convertReportToFormData(fetchedReport);

        expect(result.conductMethod).toEqual([
          { label: 'Email', value: 'email' },
          { label: 'Virtual', value: 'virtual' },
        ]);
      });

      it('should return empty array when conductMethod is null', () => {
        const fetchedReport = {
          id: 1,
          conductMethod: null,
        };

        const result = convertReportToFormData(fetchedReport);

        expect(result.conductMethod).toEqual([]);
      });

      it('should return empty array when conductMethod is undefined', () => {
        const fetchedReport = {
          id: 1,
        };

        const result = convertReportToFormData(fetchedReport);

        expect(result.conductMethod).toEqual([]);
      });
    });

    describe('reportReasons handling', () => {
      it('should preserve reportReasons when present', () => {
        const fetchedReport = {
          id: 1,
          reportReasons: ['reason1', 'reason2'],
        };

        const result = convertReportToFormData(fetchedReport);

        expect(result.reportReasons).toEqual(['reason1', 'reason2']);
      });

      it('should set reportReasons to empty array when null', () => {
        const fetchedReport = {
          id: 1,
          reportReasons: null,
        };

        const result = convertReportToFormData(fetchedReport);

        expect(result.reportReasons).toEqual([]);
      });

      it('should set reportReasons to empty array when undefined', () => {
        const fetchedReport = {
          id: 1,
        };

        const result = convertReportToFormData(fetchedReport);

        expect(result.reportReasons).toEqual([]);
      });
    });
  });
});
