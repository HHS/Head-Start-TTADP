import '@testing-library/jest-dom';
import moment from 'moment';
import {
  queryStringToFilters, filtersToQueryString, formatDateRange, decodeQueryParam,
} from '../utils';

describe('queryStringToFilters', () => {
  it('correct parses the query string', () => {
    const str = 'region.in[]=14&startDate.win=2021/11/13-2021/12/13&gibberish';
    const filters = queryStringToFilters(str);
    expect(filters.length).toBe(2);
    expect(filters.map((filter) => filter.topic).sort()).toStrictEqual(['region', 'startDate'].sort());
    expect(filters.map((filter) => filter.condition).sort()).toStrictEqual(['is', 'is within'].sort());
    expect(filters.map((filter) => filter.query).sort()).toStrictEqual([['14'], '2021/11/13-2021/12/13'].sort());
  });
});

describe('decodeQueryParam', () => {
  it('query contains a comma', () => {
    const param = 'a,b,c';
    const query = decodeQueryParam(param);
    expect(query).toStrictEqual(['a', 'b', 'c']);
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

  it('there is a region param', () => {
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

  it('handles region, second param', () => {
    const filters = [
      {
        id: '07bc65ed-a4ce-410f-b7be-f685bc8921ed',
        topic: 'startDate',
        condition: 'is within',
        query: '2021/11/13-2021/12/13',
      },
    ];
    const str = filtersToQueryString(filters, '14');
    expect(str).toBe(`startDate.win=${encodeURIComponent('2021/11/13-2021/12/13')}&region.in[]=14`);
  });

  it('handles oddball region', () => {
    const filters = [
      {
        id: '07bc65ed-a4ce-410f-b7be-f685bc8921ed',
        topic: 'startDate',
        condition: 'is within',
        query: '2021/11/13-2021/12/13',
      },
    ];
    const str = filtersToQueryString(filters, 'YOLO');
    expect(str).toBe(`startDate.win=${encodeURIComponent('2021/11/13-2021/12/13')}`);
  });
});

describe('formatDateRange', () => {
  it('nothing in, nothing out', () => {
    const str = formatDateRange();
    expect(str).toBe('');
  });

  it('returns a formatted date string', () => {
    const str = formatDateRange({
      lastThirtyDays: false,
      string: '2021/06/07-2021/06/08',
      withSpaces: true,
    });

    expect(str).toBe('06/07/2021 - 06/08/2021');
  });

  it('last three months', () => {
    const todaysDate = moment();
    const startDate = moment().subtract(3, 'months');
    const str = formatDateRange({
      lastThreeMonths: true,
      withSpaces: true,
    });
    const startDateFormatted = startDate.format('MM/DD/YYYY');
    const todaysDateFormatted = todaysDate.format('MM/DD/YYYY');
    expect(str).toBe(`${startDateFormatted} - ${todaysDateFormatted}`);
  });

  it('last six months', () => {
    const todaysDate = moment();
    const startDate = moment().subtract(6, 'months');
    const str = formatDateRange({
      lastSixMonths: true,
      withSpaces: true,
    });
    const startDateFormatted = startDate.format('MM/DD/YYYY');
    const todaysDateFormatted = todaysDate.format('MM/DD/YYYY');
    expect(str).toBe(`${startDateFormatted} - ${todaysDateFormatted}`);
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
