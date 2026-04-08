import fetchMock from 'fetch-mock';
import dataProvider from '../dataProvider';

describe('dataProvider', () => {
  afterEach(() => fetchMock.restore());

  it('getList normalizes quoted filter values', async () => {
    fetchMock.get(
      '/api/admin/grantDeliveredReviews?filter=%7B%22recipient_name%22%3A%22test%20recipient%22%7D&range=%5B0%2C9%5D&sort=%5B%22id%22%2C%22ASC%22%5D',
      { body: [], headers: { 'content-range': 'grantDeliveredReviews */0' } },
    );

    await dataProvider.getList('grantDeliveredReviews', {
      pagination: { page: 1, perPage: 10 },
      sort: { field: 'id', order: 'ASC' },
      filter: { recipient_name: '"test recipient"' },
    });

    expect(fetchMock.lastUrl()).toEqual('/api/admin/grantDeliveredReviews?filter=%7B%22recipient_name%22%3A%22test%20recipient%22%7D&range=%5B0%2C9%5D&sort=%5B%22id%22%2C%22ASC%22%5D');
  });

  it('getOne', async () => {
    fetchMock.get('/api/admin/butter/1', { id: 1, name: 'butter' });
    await dataProvider.getOne('butter', { id: 1 });

    expect(fetchMock.lastUrl()).toEqual('/api/admin/butter/1');
  });
  it('deleteMany', async () => {
    fetchMock.delete('/api/admin/butter?filter=%7B%22id%22%3A%5B1%2C2%5D%7D', { id: 1, name: 'butter' });
    await dataProvider.deleteMany('butter', { ids: [1, 2] });

    expect(fetchMock.lastUrl()).toEqual('/api/admin/butter?filter=%7B%22id%22%3A%5B1%2C2%5D%7D');
  });
});
