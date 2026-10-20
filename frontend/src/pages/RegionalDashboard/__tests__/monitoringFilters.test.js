import {
  formatMonitoringDateForQuery,
  formatMonitoringFiltersForQuery,
} from '../monitoringFilters';

describe('monitoring filter query format', () => {
  it.each([
    ['2026/07/01-2026/07/08', '2026/07/01-2026/07/08'],
    ['07/01/2026-07/08/2026', '2026/07/01-2026/07/08'],
    ['07/01/2026', '2026/07/01'],
  ])('formats %s as %s', (query, expected) => {
    expect(formatMonitoringDateForQuery(query)).toBe(expected);
  });

  it('formats every legacy date range in an array', () => {
    expect(
      formatMonitoringDateForQuery(['07/01/2026-07/08/2026', '2026/08/01-2026/08/08'])
    ).toEqual(['2026/07/01-2026/07/08', '2026/08/01-2026/08/08']);
  });

  it('leaves an invalid raw value unchanged before filter validation handles it', () => {
    expect(formatMonitoringDateForQuery('not-a-date')).toBe('not-a-date');
  });

  it('removes the generated report delivery filter without changing unrelated filters', () => {
    const regionFilter = { id: 'region-1', topic: 'region', condition: 'is', query: ['1'] };

    expect(
      formatMonitoringFiltersForQuery([
        regionFilter,
        {
          id: 'start-1',
          topic: 'startDate',
          condition: 'is within',
          query: '07/01/2026-07/08/2026',
        },
        {
          topic: 'reportDeliveryDate',
          condition: 'is within',
          query: '07/01/2026-07/08/2026',
        },
      ])
    ).toEqual([
      regionFilter,
      {
        id: 'start-1',
        topic: 'startDate',
        condition: 'is within',
        query: '2026/07/01-2026/07/08',
      },
    ]);
  });

  it('removes invalid monitoring date filters before they can be rendered or queried', () => {
    expect(
      formatMonitoringFiltersForQuery([
        {
          id: 'invalid-start',
          topic: 'startDate',
          condition: 'is within',
          query: 'Invalid date-Invalid date',
        },
        {
          id: 'valid-start',
          topic: 'startDate',
          condition: 'is within',
          query: '07/01/2026-07/08/2026',
        },
      ])
    ).toEqual([
      {
        id: 'valid-start',
        topic: 'startDate',
        condition: 'is within',
        query: '2026/07/01-2026/07/08',
      },
    ]);
  });

  it('adds a matching completeDate filter for details queries when requested', () => {
    expect(
      formatMonitoringFiltersForQuery(
        [
          {
            id: 'start-1',
            topic: 'startDate',
            condition: 'is within',
            query: '07/01/2026-07/08/2026',
          },
          {
            topic: 'reportDeliveryDate',
            condition: 'is within',
            query: '07/01/2026-07/08/2026',
          },
        ],
        { includeCompleteDate: true }
      )
    ).toEqual([
      {
        id: 'start-1',
        topic: 'startDate',
        condition: 'is within',
        query: '2026/07/01-2026/07/08',
      },
      {
        id: 'start-1-completeDate',
        topic: 'completeDate',
        condition: 'is within',
        query: '2026/07/01-2026/07/08',
      },
    ]);
  });

  it('does not keep a hidden completeDate filter without a visible startDate filter', () => {
    expect(
      formatMonitoringFiltersForQuery(
        [
          {
            id: 'complete-only',
            topic: 'completeDate',
            condition: 'is within',
            query: '2026/07/01-2026/07/08',
          },
        ],
        { includeCompleteDate: true }
      )
    ).toEqual([]);
  });

  it('accepts arrays of valid full dates for non-range conditions', () => {
    expect(
      formatMonitoringFiltersForQuery([
        {
          id: 'start-array',
          topic: 'startDate',
          condition: 'is',
          query: ['07/01/2026', '2026/07/02'],
        },
      ])
    ).toEqual([
      {
        id: 'start-array',
        topic: 'startDate',
        condition: 'is',
        query: ['2026/07/01', '2026/07/02'],
      },
    ]);
  });

  it('removes monitoring date filters containing non-string values', () => {
    expect(
      formatMonitoringFiltersForQuery([
        {
          id: 'invalid-start',
          topic: 'startDate',
          condition: 'is',
          query: [null],
        },
      ])
    ).toEqual([]);
  });

  it('does not generate duplicate complete-date filters for duplicate start-date filters', () => {
    const startDateFilter = {
      topic: 'startDate',
      condition: 'is within',
      query: '2026/07/01-2026/07/08',
    };

    expect(
      formatMonitoringFiltersForQuery([startDateFilter, { ...startDateFilter }], {
        includeCompleteDate: true,
      }).filter((filter) => filter.topic === 'completeDate')
    ).toEqual([
      {
        ...startDateFilter,
        id: undefined,
        topic: 'completeDate',
      },
    ]);
  });

  it('returns no filters when called without arguments', () => {
    expect(formatMonitoringFiltersForQuery()).toEqual([]);
  });
});
