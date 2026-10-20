import {
  activityMethodFilter,
  fixQueryWhetherStringOrArray,
  goalFilter,
  participantFilter,
  regionFilter,
  startDateFilter,
} from '../collabReportFilters';

describe('collabReportFilters', () => {
  describe('fixQueryWhetherStringOrArray', () => {
    it('returns a string unchanged', () => {
      expect(fixQueryWhetherStringOrArray('2020/01/01')).toBe('2020/01/01');
    });

    it('joins an array into a comma-separated string', () => {
      expect(fixQueryWhetherStringOrArray(['2020/01/01', '2020/01/31'])).toBe(
        '2020/01/01, 2020/01/31'
      );
    });
  });

  describe('startDateFilter', () => {
    it('has correct id and display name', () => {
      expect(startDateFilter.id).toBe('startDate');
      expect(startDateFilter.display).toBe('Date created');
    });

    it('formats a date range string containing a hyphen', () => {
      const result = startDateFilter.displayQuery('2026/01/01-2026/01/31');
      expect(result).toBe('01/01/2026-01/31/2026');
    });

    it('formats a single date string', () => {
      const result = startDateFilter.displayQuery('2026/03/15');
      expect(result).toBe('03/15/2026');
    });

    it('joins an array before formatting when it contains a range', () => {
      const result = startDateFilter.displayQuery(['2026/01/01', '2026/01/31']);
      expect(result).toBe('01/01/2026');
    });
  });

  describe('regionFilter', () => {
    it('has correct id and display name', () => {
      expect(regionFilter.id).toBe('region');
      expect(regionFilter.display).toBe('Region');
    });

    it('has correct default values', () => {
      expect(regionFilter.defaultValues).toEqual({ is: '', 'is not': '' });
    });

    it('returns the query string unchanged via displayQuery', () => {
      expect(regionFilter.displayQuery('5')).toBe('5');
    });
  });

  describe('goalFilter', () => {
    it('has correct id and display name', () => {
      expect(goalFilter.id).toBe('goal');
      expect(goalFilter.display).toBe('Supporting goals');
    });

    it('has correct default values for multi-select', () => {
      expect(goalFilter.defaultValues).toEqual({ is: [], 'is not': [] });
    });

    it('returns the query string unchanged via displayQuery', () => {
      expect(goalFilter.displayQuery('School readiness')).toBe('School readiness');
    });
  });

  describe('activityMethodFilter', () => {
    it('has correct id and display name', () => {
      expect(activityMethodFilter.id).toBe('conductMethod');
      expect(activityMethodFilter.display).toBe('Activity method');
    });

    it('has correct default values for multi-select', () => {
      expect(activityMethodFilter.defaultValues).toEqual({ is: [], 'is not': [] });
    });

    it('displays a single method value as its label', () => {
      expect(activityMethodFilter.displayQuery(['email'])).toBe('Email');
    });

    it('displays multiple method values as comma-separated labels', () => {
      expect(activityMethodFilter.displayQuery(['email', 'virtual'])).toBe('Email, Virtual');
    });

    it('displays all valid method values as labels', () => {
      expect(activityMethodFilter.displayQuery(['email', 'phone', 'in_person', 'virtual'])).toBe(
        'Email, Phone, In person, Virtual'
      );
    });

    it('falls back to the raw value when a label is not found', () => {
      expect(activityMethodFilter.displayQuery(['unknown_method'])).toBe('unknown_method');
    });

    it('returns an empty string when the query is empty', () => {
      expect(activityMethodFilter.displayQuery([])).toBe('');
    });

    it('returns an empty string when the query is null or undefined', () => {
      expect(activityMethodFilter.displayQuery(null)).toBe('');
      expect(activityMethodFilter.displayQuery(undefined)).toBe('');
    });

    it('accepts a non-array value and treats it as a single entry', () => {
      expect(activityMethodFilter.displayQuery('phone')).toBe('Phone');
    });
  });

  describe('participantFilter', () => {
    it('has correct id and display name', () => {
      expect(participantFilter.id).toBe('participants');
      expect(participantFilter.display).toBe('Participants');
    });

    it('has correct default values for multi-select', () => {
      expect(participantFilter.defaultValues).toEqual({ is: [], 'is not': [] });
    });

    it('returns array queries as comma-separated text', () => {
      expect(
        participantFilter.displayQuery(['Head Start Collaboration Office', 'Regional Office staff'])
      ).toBe('Head Start Collaboration Office, Regional Office staff');
    });
  });
});
