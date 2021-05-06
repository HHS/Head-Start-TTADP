import join from 'url-join';
import fetchMock from 'fetch-mock';

import {
  submitReport,
  saveReport,
  reviewReport,
  resetToDraft,
  legacyReportById,
  getReports,
  getReportAlerts,
} from '../activityReports';
import { REPORTS_PER_PAGE } from '../../Constants';

describe('activityReports fetcher', () => {
  afterEach(() => fetchMock.restore());

  describe('getReports', () => {
    it('defaults query params', async () => {
      const query = {
        sortBy: 'updatedAt',
        sortDir: 'desc',
        offset: 0,
        limit: 10,
        filters: 'filters',
      };

      fetchMock.get(join('api', 'activity-reports'), [], { query });
      await getReports(undefined, undefined, undefined, undefined, 'filters=filters');
      expect(fetchMock.called()).toBeTruthy();
    });

    it('can be filtered', async () => {
      const query = {
        sortBy: 'updatedAt',
        sortDir: 'desc',
        offset: 0,
        limit: 10,
        filters: 'filters',
      };

      fetchMock.get(join('api', 'activity-reports'), [], { query });
      await getReports('updatedAt', 'desc', 0, REPORTS_PER_PAGE, 'filters=filters');
      expect(fetchMock.called()).toBeTruthy();
    });
  });

  describe('getReportAlerts', () => {
    it('defaults query params', async () => {
      const query = {
        sortBy: 'startDate',
        sortDir: 'asc',
        offset: 0,
        limit: 10,
        filters: 'filters',
      };

      fetchMock.get(join('api', 'activity-reports', 'alerts'), [], { query });
      await getReportAlerts(undefined, undefined, undefined, undefined, 'filters=filters');
      expect(fetchMock.called()).toBeTruthy();
    });

    it('can be filtered', async () => {
      const query = {
        sortBy: 'updatedAt',
        sortDir: 'desc',
        offset: 0,
        limit: 10,
        filters: 'filters',
      };

      fetchMock.get(join('api', 'activity-reports', 'alerts'), [], { query });
      await getReportAlerts('updatedAt', 'desc', 0, REPORTS_PER_PAGE, 'filters=filters');
      expect(fetchMock.called()).toBeTruthy();
    });
  });

  describe('legacyReportById', () => {
    it('returns the report', async () => {
      const expected = { id: 1 };
      fetchMock.get(join('api', 'activity-reports', 'legacy', '1'), expected);
      const report = await legacyReportById('1');
      expect(report).toEqual(expected);
    });
  });

  describe('submitReport', () => {
    it('returns the report', async () => {
      const report = { id: 1 };
      fetchMock.post(join('api', 'activity-reports', '1', 'submit'), report);
      const savedReport = await submitReport(1, report);
      expect(savedReport).toEqual(report);
    });
  });

  describe('saveReport', () => {
    it('returns the report', async () => {
      const report = { id: 1 };
      fetchMock.put(join('api', 'activity-reports', '1'), report);
      const savedReport = await saveReport(1, report);
      expect(savedReport).toEqual(report);
    });
  });

  describe('resetToDraft', () => {
    it('calls reset and returns the result', async () => {
      const report = { id: 1 };
      fetchMock.put(join('api', 'activity-reports', '1', 'reset'), report);
      const savedReport = await resetToDraft(1);
      expect(savedReport).toEqual(report);
    });
  });

  describe('reviewReport', () => {
    it('returns the report', async () => {
      const report = { id: 1 };
      fetchMock.put(join('api', 'activity-reports', '1', 'review'), report);
      const savedReport = await reviewReport(1, report);
      expect(savedReport).toEqual(report);
    });
  });
});
