import fetchMock from 'fetch-mock';
import join from 'url-join';
import { getSheetById, getSheets } from '../ss';

const sheetsUrl = join('/', 'api', 'admin', 'ss');

beforeEach(() => {
  fetchMock.restore();
});

describe('getSheets', () => {
  it('should fetch sheets', async () => {
    const mockSheets = [{ id: 1, name: 'Sheet1' }, { id: 2, name: 'Sheet2' }];
    fetchMock.getOnce(sheetsUrl, mockSheets);

    const sheets = await getSheets();
    expect(sheets).toEqual(mockSheets);
    expect(fetchMock.called(sheetsUrl)).toBeTruthy();
  });

  it('handles errors', async () => {
    fetchMock.getOnce(sheetsUrl, 500);

    await expect(getSheets()).rejects.toThrow(Error);
    expect(fetchMock.called(sheetsUrl)).toBeTruthy();
  });
});

describe('getSheetById', () => {
  it('should fetch a sheet by ID', async () => {
    const mockSheet = { id: 1, name: 'Sheet1' };
    const sheetId = '1';
    const activeSheetUrl = `/api/admin/ss/sheet/${sheetId}`;
    fetchMock.getOnce(activeSheetUrl, mockSheet);

    const sheet = await getSheetById(sheetId);
    expect(sheet).toEqual(mockSheet);
    expect(fetchMock.called(activeSheetUrl)).toBeTruthy();
  });

  it('should throw an error if the fetch request fails', async () => {
    const sheetId = '1';
    const activeSheetUrl = `/api/admin/ss/sheet/${sheetId}`;

    fetchMock.getOnce(activeSheetUrl, 500);

    await expect(getSheetById(sheetId)).rejects.toThrow(Error);
    expect(fetchMock.called(activeSheetUrl)).toBeTruthy();
  });
});
