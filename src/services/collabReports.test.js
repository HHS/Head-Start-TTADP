// Stuff goes here
import { collabReportById } from './collabReports';

describe('collabReportById', () => {
  it('returns the correct report when given a valid ID', async () => {
    const reports = [
      { id: 1, title: 'Report 1' },
      { id: 2, title: 'Report 2' },
      { id: 3, title: 'Report 3' },
    ];
    const result = await collabReportById(reports, 2);
    expect(result).toEqual({ id: 2, title: 'Report 2' });
  });

  it('returns null when given an ID that does not exist', async () => {
    const reports = [
      { id: 1, title: 'Report 1' },
      { id: 2, title: 'Report 2' },
      { id: 3, title: 'Report 3' },
    ];
    const result = await collabReportById(reports, 4);
    expect(result).toBeNull();
  });

  it('returns null when given an empty array', async () => {
    const reports = [];
    const result = await collabReportById(reports, 1);
    expect(result).toBeNull();
  });
});
