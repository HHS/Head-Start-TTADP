import fetchMock from 'fetch-mock';
import join from 'url-join';
import { REPORTS_PER_PAGE } from '../../Constants';
import {
  deleteReport,
  downloadActivityReportExport,
  downloadReports,
  getGroupsForActivityReport,
  getReportAlerts,
  getReports,
  getReportsForLocalStorageCleanup,
  getReportsViaIdPost,
  legacyReportById,
  resetToDraft,
  reviewReport,
  saveReport,
  submitReport,
  unlockReport,
} from '../activityReports';

const response = {
  rows: [],
  count: 0,
  recipients: [],
  topics: [],
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

  describe('downloadActivityReportExport', () => {
    it.each(['activity-reports', 'goals', 'objectives'])(
      'downloads the %s dataset',
      async (dataSet) => {
        const url = join('api', 'activity-reports', 'export');
        fetchMock.post(url, 'Report ID\n1');

        const blob = await downloadActivityReportExport(dataSet, [1, 2]);

        expect(await blob.text()).toBe('Report ID\n1');
        expect(JSON.parse(fetchMock.lastOptions(url).body)).toEqual({ dataSet, reportIds: [1, 2] });
      }
    );

    it('rejects failed exports', async () => {
      fetchMock.post(join('api', 'activity-reports', 'export'), 429);
      await expect(downloadActivityReportExport('goals', [1])).rejects.toMatchObject({
        status: 429,
      });
    });

    it('sends full-table filters without requesting a limited page of IDs', async () => {
      const url = '/api/activity-reports/export?region.in[]=1&recipient.in[]=2';
      fetchMock.post(url, 'Report ID\n1');
      await downloadActivityReportExport('objectives', undefined, 'region.in[]=1&recipient.in[]=2');
      expect(JSON.parse(fetchMock.lastOptions(url).body)).toEqual({
        dataSet: 'objectives',
        exportAll: true,
      });
    });

    it('does not apply table filters to explicitly selected IDs', async () => {
      const url = '/api/activity-reports/export';
      fetchMock.post(url, 'Report ID\n1');
      await downloadActivityReportExport('goals', [1], 'region.in[]=1');
      expect(JSON.parse(fetchMock.lastOptions(url).body)).toEqual({
        dataSet: 'goals',
        reportIds: [1],
      });
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
