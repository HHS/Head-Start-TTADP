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
  deleteReport,
} from '../activityReports';

describe('activityReports fetcher', () => {
  afterEach(() => fetchMock.restore());

  describe('getReports', () => {
    it('defaults query params', async () => {
      const query = {
        sortBy: 'updatedAt',
        sortDir: 'desc',
        offset: 0,
        limit: 10,
      };

      fetchMock.get(join('api', 'activity-reports'), [], { query });
      await getReports();
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
      };

      fetchMock.get(join('api', 'activity-reports', 'alerts'), [], { query });
      await getReportAlerts();
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

  describe('deleteReport', () => {
    it('deletes the report', async () => {
      const status = { status: 200 };
      fetchMock.delete(join('api', 'activity-reports', '1'), status);
      await deleteReport(1);
      expect(fetchMock.called()).toBeTruthy();
    });
  });
});
