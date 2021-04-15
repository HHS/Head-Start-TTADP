import { getReportsDownloadURL } from '../helpers';

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
