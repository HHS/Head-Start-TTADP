import fetchMock from 'fetch-mock';
import join from 'url-join';
import { getSelfServiceData, containsFiltersThatAreNotApplicable } from '../ssdi';

const ssdiUrl = join('/', 'api', 'ssdi', 'api', 'dashboards', 'qa');

beforeEach(() => {
  fetchMock.restore();
});

describe('SSDI fetcher', () => {
  it('should fetch data for qa-dashboard', async () => {
    const mockData = [{ data: 'Expected' }];
    const url = join(ssdiUrl, 'dashboard.sql', '?region.in[]=14');
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
    const url = join(ssdiUrl, 'fei.sql', '?region.in[]=14');
    fetchMock.getOnce(url, mockData);

    const res = await getSelfServiceData('recipients-with-ohs-standard-fei-goal', [
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
    const url = join(ssdiUrl, 'no-tta.sql', '?region.in[]=14');
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

  it('containsFiltersThatAreNotApplicable returns false if all filters are allowed', () => {
    const filters = [
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
    ];
    expect(containsFiltersThatAreNotApplicable('recipients-with-no-tta', filters)).toBe(true);
  });

  it('grantStatus is an allowed filter for recipients-with-no-tta', () => {
    const filters = [
      {
        id: '9ac8381c-2507-4b4a-a30c-6f1f87a00901',
        topic: 'region',
        condition: 'is',
        query: '14',
      },
      {
        id: '9ac8381c-2507-4b4a-a30c-6f1f8723401',
        topic: 'grantStatus',
        condition: 'is',
        query: 'active',
      },
    ];
    expect(containsFiltersThatAreNotApplicable('recipients-with-no-tta', filters)).toBe(false);
  });

  it('containsFiltersThatAreNotApplicable returns true if any filter is not allowed', () => {
    const filters = [
      {
        id: '9ac8381c-2507-4b4a-a30c-6f1f87a00901',
        topic: 'region',
        condition: 'is',
        query: '14',
      },
      {
        id: '9ac8381c-2507-4b4a-a30c-6f1f8723401',
        topic: 'stateCode',
        condition: 'is',
        query: 'ct',
      },
    ];
    expect(containsFiltersThatAreNotApplicable('recipients-with-class-scores-and-goals', filters)).toBe(false);
  });
});
