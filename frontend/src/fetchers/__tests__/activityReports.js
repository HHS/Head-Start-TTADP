import join from 'url-join';
import fetchMock from 'fetch-mock';

import {
  submitReport, saveReport, reviewReport, resetToDraft,
} from '../activityReports';

describe('activityReports fetcher', () => {
  afterEach(() => fetchMock.restore());

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
