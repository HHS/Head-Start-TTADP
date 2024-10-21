import fetchMock from 'fetch-mock';
import join from 'url-join';
import { getSelfServiceData } from '../ssdi';

const ssdiUrl = join('/', 'api', 'ssdi');

beforeEach(() => {
  fetchMock.restore();
});

describe('SSDI fetcher', () => {
  it('should fetch data for qa-dashboard', async () => {
    const mockData = [{ data: 'Expected' }];
    const url = join(ssdiUrl, 'qa-dashboard', '?region.in[]=14');
    fetchMock.getOnce(url, mockData);
    const res = await getSelfServiceData('qa-dashboard', [{
      id: '9ac8381c-2507-4b4a-a30c-6f1f87a00901',
      topic: 'region',
      condition: 'is',
      query: '14',
    }]);
    expect(res).toEqual(mockData);
    expect(fetchMock.called(url)).toBeTruthy();
  });
  it('recipients-with-ohs-standard-goal', async () => {
    const mockData = [{ data: 'Expected' }];
    const url = join(ssdiUrl, 'recipients-with-ohs-standard-goal', '?region.in[]=14');
    fetchMock.getOnce(url, mockData);

    const res = await getSelfServiceData('recipients-with-ohs-standard-goal', [
      {
        id: '9ac8381c-2507-4b4a-a30c-6f1f87a00901',
        topic: 'region',
        condition: 'is',
        query: '14',
      },
      {
        id: '9ac8381c-2507-4b4a-a30c-6f1f8723401',
        topic: 'pickles',
        condition: 'are',
        query: 'spicy',
      },
    ]);
    expect(res).toEqual(mockData);
    expect(fetchMock.called(url)).toBeTruthy();
  });
  it('recipients-with-no-tta', async () => {
    const mockData = [{ data: 'Expected' }];
    const url = join(ssdiUrl, 'recipients-with-no-tta', '?region.in[]=14');
    fetchMock.getOnce(url, mockData);

    const res = await getSelfServiceData('recipients-with-no-tta', [
      {
        id: '9ac8381c-2507-4b4a-a30c-6f1f87a00901',
        topic: 'region',
        condition: 'is',
        query: '14',
      },
      {
        id: '9ac8381c-2507-4b4a-a30c-6f1f8723401',
        topic: 'pickles',
        condition: 'are',
        query: 'spicy',
      },
    ]);
    expect(res).toEqual(mockData);
    expect(fetchMock.called(url)).toBeTruthy();
  });
  it('handles error in filterName', async () => {
    await expect(getSelfServiceData('epicurean-delights', [
      {
        id: '9ac8381c-2507-4b4a-a30c-6f1f87a00901',
        topic: 'region',
        condition: 'is',
        query: '14',
      },
      {
        id: '9ac8381c-2507-4b4a-a30c-6f1f8723401',
        topic: 'pickles',
        condition: 'are',
        query: 'spicy',
      },
    ])).rejects.toThrow('Invalid filter name');
  });
});
