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
  downloadReports,
  unlockReport,
  getReportsForLocalStorageCleanup,
  getReportsViaIdPost,
  getGroupsForActivityReport,
} from '../activityReports';
import { REPORTS_PER_PAGE } from '../../Constants';

const response = {
  rows: [], count: 0, recipients: [], topics: [],
};
const alerts = { alertsCount: 0, alerts: [], recipients: [] };

describe('activityReports fetcher', () => {
  afterEach(() => fetchMock.restore());

  describe('getReportsViaIdPost', () => {
    it('fetches via post (OH NO)', async () => {
      fetchMock.post(join('api', 'activity-reports', 'reportsByManyIds'), response);
      await getReportsViaIdPost([1]);
      expect(fetchMock.called()).toBeTruthy();
    });
  });

  describe('getReports', () => {
    it('defaults query params', async () => {
      const query = {
        sortBy: 'updatedAt',
        sortDir: 'desc',
        offset: 0,
        limit: 10,
        filters: 'filters',
      };

      fetchMock.get(join('api', 'activity-reports'), response, { query });
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

      fetchMock.get(join('api', 'activity-reports'), response, { query });
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
      };

      fetchMock.get(join('api', 'activity-reports', 'alerts'), alerts, { query });
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

      fetchMock.get(join('api', 'activity-reports', 'alerts'), alerts, { query });
      await getReportAlerts('updatedAt', 'desc', 0, REPORTS_PER_PAGE, 'filters=filters');
      expect(fetchMock.called()).toBeTruthy();
    });
  });

  describe('getGroupsForActivityReport', () => {
    it('returns the groups', async () => {
      const expected = { id: 1 };
      fetchMock.get(join('api', 'activity-reports', 'groups', '?region=1'), expected);
      const report = await getGroupsForActivityReport('1');
      expect(report).toEqual(expected);
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
    it('returns success', async () => {
      const report = { id: 1 };
      fetchMock.put(join('api', 'activity-reports', '1', 'submit'), report);
      const submittedReport = await submitReport(1, report);
      expect(fetchMock.called()).toBeTruthy();
      expect(submittedReport).toEqual(report);
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

  describe('unlockReport', () => {
    it('unlcoks the report', async () => {
      const status = { status: 200 };
      fetchMock.put(join('api', 'activity-reports', '1', 'unlock'), status);
      await unlockReport(1);
      expect(fetchMock.called()).toBeTruthy();
    });
  });

  describe('downloadReports', () => {
    it('returns a blob', async () => {
      // const status = { status: 200 };
      fetchMock.get('url', new Blob());
      await downloadReports('url');
      expect(fetchMock.called()).toBeTruthy();
    });
  });

  describe('getReportsForLocalStorageCleanup', () => {
    it('returns as expected', async () => {
      fetchMock.get(join('api', 'activity-reports', 'storage-cleanup'), []);
      await getReportsForLocalStorageCleanup();
      expect(fetchMock.called()).toBeTruthy();
    });
  });
});
