import { getReportsDownloadURL, getAllReportsDownloadURL } from '../helpers';

describe('getReportsDownloadURL', () => {
  it('Creates a URL for downloading a single report', () => {
    const dlURL = getReportsDownloadURL([1]);
    expect(dlURL).toMatch('report[]=1');
  });

  it('Creates a URL for downloading multiple reports', () => {
    const dlURL = getReportsDownloadURL([1, 23, 42]);
    expect(dlURL).toMatch('report[]=1');
    expect(dlURL).toMatch('report[]=23');
    expect(dlURL).toMatch('report[]=42');
  });

  it('Ouputs no report query params if no reports provided', () => {
    const dlURL = getReportsDownloadURL([]);
    expect(dlURL).not.toMatch('report[]=');
  });
});

describe('getAllReportsDownloadURL', () => {
  it('creates a URL for downloading all reports', () => {
    const url = getAllReportsDownloadURL();
    expect(url).toMatch('/api/activity-reports/download-all');
  });

  it('creates a URL for downloading all reports with a filter', () => {
    const url = getAllReportsDownloadURL('filter');
    expect(url).toMatch('/api/activity-reports/download-all?filter');
  });
});
