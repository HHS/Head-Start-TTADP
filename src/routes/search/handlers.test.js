/* eslint-disable jest/no-disabled-tests */
import { INTERNAL_SERVER_ERROR } from 'http-codes';
import {
  searchIndex,
} from './handlers';
import {
  search,
} from '../../lib/awsElasticSearch/index';

jest.mock('../../lib/awsElasticSearch/index', () => ({
  search: jest.fn(),
}));

const mockResponse = {
  attachment: jest.fn(),
  json: jest.fn(),
  send: jest.fn(),
  sendStatus: jest.fn(),
  status: jest.fn(() => ({
    end: jest.fn(),
  })),
};

describe('search', () => {
  afterEach(() => {
    search.mockClear();
  });

  it('searches successfully', async () => {
    const searchReq = {
      query: {
        index: 'index-test',
        fields: ['specialist'],
        query: 'James Bond',
      },
    };

    const hits = {
      hits: [{
        _index: 'test-index',
        _type: '_doc',
        _id: '2',
        _score: 0.9808291,
        _source: {
          id: 2, title: 'My Region 2 Activity Report', specialist: 'Harry Potter', year: '2021',
        },
      }],
    };

    search.mockResolvedValue(hits);
    await searchIndex(searchReq, mockResponse);
    expect(mockResponse.json).toHaveBeenCalledWith(hits);
  });

  it('handles error', async () => {
    search.mockImplementationOnce(() => {
      throw new Error();
    });
    const searchReq = {
      query: {
        index: 'index-test',
        fields: ['specialist'],
        query: 'James Bond',
      },
    };
    search.mockResolvedValue([]);
    await searchIndex(searchReq, mockResponse);
    expect(mockResponse.status).toHaveBeenCalledWith(INTERNAL_SERVER_ERROR);
  });
});
