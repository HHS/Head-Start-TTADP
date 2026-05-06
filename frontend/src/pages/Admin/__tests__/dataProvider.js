import fetchMock from 'fetch-mock';
import dataProvider from '../dataProvider';

describe('dataProvider', () => {
  afterEach(() => fetchMock.restore());

  it('getList preserves quoted filter values', async () => {
    fetchMock.get(
      '/api/admin/grantDeliveredReviews?filter=%7B%22recipient_name%22%3A%22%5C%22test%20recipient%5C%22%22%7D&range=%5B0%2C9%5D&sort=%5B%22id%22%2C%22ASC%22%5D',
      { body: [], headers: { 'content-range': 'grantDeliveredReviews */0' } }
    );

    await dataProvider.getList('grantDeliveredReviews', {
      pagination: { page: 1, perPage: 10 },
      sort: { field: 'id', order: 'ASC' },
      filter: { recipient_name: '"test recipient"' },
    });

    expect(fetchMock.lastUrl()).toEqual(
      '/api/admin/grantDeliveredReviews?filter=%7B%22recipient_name%22%3A%22%5C%22test%20recipient%5C%22%22%7D&range=%5B0%2C9%5D&sort=%5B%22id%22%2C%22ASC%22%5D'
    );
  });

  it('getList preserves nested arrays and objects in filter values', async () => {
    fetchMock.get(
      '/api/admin/grantDeliveredReviews?filter=%7B%22recipient_name%22%3A%22%27test%20recipient%27%22%2C%22nested%22%3A%7B%22citation%22%3A%22%5C%22alpha%5C%22%22%7D%2C%22tags%22%3A%5B%22%5C%22beta%5C%22%22%2C%22plain%22%5D%7D&range=%5B10%2C19%5D&sort=%5B%22updatedAt%22%2C%22DESC%22%5D',
      { body: [], headers: { 'content-range': 'grantDeliveredReviews */25' } }
    );

    const response = await dataProvider.getList('grantDeliveredReviews', {
      pagination: { page: 2, perPage: 10 },
      sort: { field: 'updatedAt', order: 'DESC' },
      filter: {
        recipient_name: "'test recipient'",
        nested: {
          citation: '"alpha"',
        },
        tags: ['"beta"', 'plain'],
      },
    });

    expect(fetchMock.lastUrl()).toEqual(
      '/api/admin/grantDeliveredReviews?filter=%7B%22recipient_name%22%3A%22%27test%20recipient%27%22%2C%22nested%22%3A%7B%22citation%22%3A%22%5C%22alpha%5C%22%22%7D%2C%22tags%22%3A%5B%22%5C%22beta%5C%22%22%2C%22plain%22%5D%7D&range=%5B10%2C19%5D&sort=%5B%22updatedAt%22%2C%22DESC%22%5D'
    );
    expect(response.total).toBe(25);
  });

  it('getList defaults total to zero when content-range is missing', async () => {
    fetchMock.get(
      '/api/admin/grantDeliveredReviews?filter=%7B%22recipient_name%22%3A%22plain%22%7D&range=%5B0%2C9%5D&sort=%5B%22id%22%2C%22ASC%22%5D',
      { body: [] }
    );

    const response = await dataProvider.getList('grantDeliveredReviews', {
      pagination: { page: 1, perPage: 10 },
      sort: { field: 'id', order: 'ASC' },
      filter: { recipient_name: 'plain' },
    });

    expect(response.total).toBe(0);
  });

  it('getOne', async () => {
    fetchMock.get('/api/admin/butter/1', { id: 1, name: 'butter' });
    await dataProvider.getOne('butter', { id: 1 });

    expect(fetchMock.lastUrl()).toEqual('/api/admin/butter/1');
  });
  it('deleteMany', async () => {
    fetchMock.delete('/api/admin/butter?filter=%7B%22id%22%3A%5B1%2C2%5D%7D', {
      id: 1,
      name: 'butter',
    });
    await dataProvider.deleteMany('butter', { ids: [1, 2] });

    expect(fetchMock.lastUrl()).toEqual('/api/admin/butter?filter=%7B%22id%22%3A%5B1%2C2%5D%7D');
  });
});
