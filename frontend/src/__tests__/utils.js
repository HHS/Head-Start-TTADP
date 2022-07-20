import '@testing-library/jest-dom';
import {
  queryStringToFilters, filtersToQueryString, formatDateRange, decodeQueryParam,
} from '../utils';

describe('queryStringToFilters', () => {
  it('correct parses the query string', () => {
    const str = 'region.in[]=14&startDate.win=2021/11/13-2021/12/13&gibberish';
    const filters = queryStringToFilters(str);
    expect(filters.length).toBe(2);
    expect(filters.map((filter) => filter.topic)).toStrictEqual(['region', 'startDate']);
    expect(filters.map((filter) => filter.condition)).toStrictEqual(['is', 'is within']);
    expect(filters.map((filter) => filter.query)).toStrictEqual([['14'], '2021/11/13-2021/12/13']);
  });
});

describe('decodeQueryParam', () => {
  it('splits on commas', () => {
    const q = decodeQueryParam('test,test');
    expect(q).toStrictEqual(['test', 'test']);
  });
});

describe('filtersToQueryString', () => {
  it('correct parses the filters', () => {
    const filters = [
      {
        id: '9ac8381c-2507-4b4a-a30c-6f1f87a00901',
        topic: 'region',
        condition: 'is',
        query: '14',
      },
      {
        id: '07bc65ed-a4ce-410f-b7be-f685bc8921ed',
        topic: 'startDate',
        condition: 'is within',
        query: '2021/11/13-2021/12/13',
      },
    ];
    const str = filtersToQueryString(filters);
    expect(str).toBe(`region.in[]=14&startDate.win=${encodeURIComponent('2021/11/13-2021/12/13')}`);
  });

  it('adds a region if it is not present in the filters but is passed in', () => {
    const filters = [
      {
        id: '07bc65ed-a4ce-410f-b7be-f685bc8921ed',
        topic: 'startDate',
        condition: 'is within',
        query: '2021/11/13-2021/12/13',
      },
    ];
    const str = filtersToQueryString(filters, 14);
    expect(str).toBe(`startDate.win=${encodeURIComponent('2021/11/13-2021/12/13')}&region.in[]=14`);
  });
});

describe('formatDateRange', () => {
  it('returns a formatted date string', () => {
    const str = formatDateRange({
      lastThirtyDays: false,
      string: '2021/06/07-2021/06/08',
      withSpaces: true,
    });

    expect(str).toBe('06/07/2021 - 06/08/2021');
  });

  it('returns a formatted date string without spaces', () => {
    const str = formatDateRange({
      string: '2021/06/07-2021/06/08',
      withSpaces: false,
    });

    expect(str).toBe('06/07/2021-06/08/2021');
  });
  it('returns a blank string if nothing is passed in', () => {
    const str = formatDateRange();
    expect(str).toBe('');
  });
});
