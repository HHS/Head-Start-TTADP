import '@testing-library/jest-dom';
import moment from 'moment';
import {
  queryStringToFilters,
  filtersToQueryString,
  formatDateRange,
  decodeQueryParam,
  isInternalGovernmentLink,
  expandFilters,
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

  it('consolidates multiple values for the same topic and condition', () => {
    const str = 'region.in[]=1&region.in[]=2&region.in[]=3&group.in[]=390';
    const filters = queryStringToFilters(str);
    expect(filters.length).toBe(2);

    const regionFilter = filters.find((f) => f.topic === 'region');
    expect(regionFilter).toBeDefined();
    expect(regionFilter.condition).toBe('is');
    expect(regionFilter.query).toEqual(['1', '2', '3']);

    const groupFilter = filters.find((f) => f.topic === 'group');
    expect(groupFilter).toBeDefined();
    expect(groupFilter.condition).toBe('is');
    expect(groupFilter.query).toEqual(['390']);
  });
});

describe('decodeQueryParam', () => {
  it('query contains a comma', () => {
    const param = 'a,b,c';
    const query = decodeQueryParam(param);
    expect(query).toStrictEqual(['a', 'b', 'c']);
  });
});

describe('isInternalGovernmentLink', () => {
  it('correctly validates eclkc url', () => {
    const url = 'https://eclkc.ohs.acf.hhs.gov';
    const isValid = isInternalGovernmentLink(url);
    expect(isValid).toBe(true);
  });

  it('correctly validates headstart url', () => {
    const url = 'https://headstart.gov/fsafsafs/dsalkjf';
    const isValid = isInternalGovernmentLink(url);
    expect(isValid).toBe(true);
  });

  it('correctly validates non-government url', () => {
    const url = 'https://google.com';
    const isValid = isInternalGovernmentLink(url);
    expect(isValid).toBe(false);
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

describe('expandFilters', () => {
  it('expands filters with array queries into separate filter objects', () => {
    const filters = [
      {
        id: 'test-id-1',
        topic: 'region',
        condition: 'is',
        query: ['1', '2', '3'],
      },
    ];
    const expanded = expandFilters(filters);

    expect(expanded.length).toBe(3);
    expect(expanded[0]).toEqual({
      id: 'test-id-1-1',
      originalFilterId: 'test-id-1',
      topic: 'region',
      condition: 'is',
      query: '1',
    });
    expect(expanded[1]).toEqual({
      id: 'test-id-1-2',
      originalFilterId: 'test-id-1',
      topic: 'region',
      condition: 'is',
      query: '2',
    });
    expect(expanded[2]).toEqual({
      id: 'test-id-1-3',
      originalFilterId: 'test-id-1',
      topic: 'region',
      condition: 'is',
      query: '3',
    });
  });

  it('passes through filters with non-array queries unchanged', () => {
    const filters = [
      {
        id: 'test-id-2',
        topic: 'startDate',
        condition: 'is within',
        query: '2021/11/13-2021/12/13',
      },
    ];
    const expanded = expandFilters(filters);

    expect(expanded.length).toBe(1);
    expect(expanded[0]).toEqual(filters[0]);
  });

  it('handles mixed array and non-array filters', () => {
    const filters = [
      {
        id: 'test-id-1',
        topic: 'region',
        condition: 'is',
        query: ['1', '2'],
      },
      {
        id: 'test-id-2',
        topic: 'startDate',
        condition: 'is within',
        query: '2021/11/13-2021/12/13',
      },
      {
        id: 'test-id-3',
        topic: 'group',
        condition: 'is',
        query: ['390'],
      },
    ];
    const expanded = expandFilters(filters);

    expect(expanded.length).toBe(4);

    // First two should be expanded regions
    expect(expanded[0].topic).toBe('region');
    expect(expanded[0].query).toBe('1');
    expect(expanded[0].originalFilterId).toBe('test-id-1');
    expect(expanded[1].topic).toBe('region');
    expect(expanded[1].query).toBe('2');
    expect(expanded[1].originalFilterId).toBe('test-id-1');

    // Third should be unchanged date filter
    expect(expanded[2]).toEqual(filters[1]);

    // Fourth should be expanded group
    expect(expanded[3].topic).toBe('group');
    expect(expanded[3].query).toBe('390');
    expect(expanded[3].originalFilterId).toBe('test-id-3');
  });

  it('creates unique IDs for each expanded filter', () => {
    const filters = [
      {
        id: 'filter-abc',
        topic: 'region',
        condition: 'is',
        query: ['10', '20', '30'],
      },
    ];
    const expanded = expandFilters(filters);

    const ids = expanded.map((f) => f.id);
    expect(ids).toEqual(['filter-abc-10', 'filter-abc-20', 'filter-abc-30']);

    // All IDs should be unique
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(3);
  });

  it('handles empty array', () => {
    const filters = [];
    const expanded = expandFilters(filters);
    expect(expanded).toEqual([]);
  });
});
