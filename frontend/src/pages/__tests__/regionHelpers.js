import { buildDefaultRegionFilters, showFilterWithMyRegions } from '../regionHelpers';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

describe('buildDefaultRegionFilters', () => {
  it('returns an empty array when there are no regions', () => {
    expect(buildDefaultRegionFilters([])).toEqual([]);
  });

  it('builds a region filter per region', () => {
    expect(buildDefaultRegionFilters([1, 2])).toEqual([
      expect.objectContaining({
        topic: 'region',
        condition: 'is',
        query: 1,
      }),
      expect.objectContaining({
        topic: 'region',
        condition: 'is',
        query: 2,
      }),
    ]);
  });
});

describe('showFilterWithMyRegions', () => {
  it('shows Filter With My Regions', async () => {
    const allRegionsFilters = [
      {
        query: 1,
      },
    ];

    const filters = [
      {
        topic: 'region',
        query: 2,
      },
    ];
    const setFilters = jest.fn();
    showFilterWithMyRegions(allRegionsFilters, filters, setFilters);
    expect(setFilters).toHaveBeenCalledWith([{ query: 1 }]);
  });

  it('preserves non-region filters when replacing denied region filters', async () => {
    const allRegionsFilters = [
      {
        query: 1,
      },
    ];

    const filters = [
      {
        topic: 'region',
        query: 2,
      },
      {
        topic: 'status',
        query: 'approved',
      },
    ];
    const setFilters = jest.fn();
    showFilterWithMyRegions(allRegionsFilters, filters, setFilters);
    expect(setFilters).toHaveBeenCalledWith([{ query: 1 }, { topic: 'status', query: 'approved' }]);
  });

  it('handles alternate case when accessible region filter is preserved', async () => {
    const allRegionsFilters = [
      {
        query: 1,
      },
      {
        query: 2,
      },
    ];

    const filters = [
      {
        topic: 'region',
        query: 2,
      },
    ];
    const setFilters = jest.fn();
    showFilterWithMyRegions(allRegionsFilters, filters, setFilters);
    // region 2 is accessible, so it is kept rather than replaced with allRegionsFilters
    expect(setFilters).toHaveBeenCalledWith([{ topic: 'region', query: 2 }]);
  });

  it('and another', async () => {
    const allRegionsFilters = [
      {
        query: 2,
      },
      {
        query: 2,
      },
    ];

    const filters = [
      {
        topic: 'region',
        query: [2],
      },
    ];
    const setFilters = jest.fn();
    showFilterWithMyRegions(allRegionsFilters, filters, setFilters);
    expect(setFilters).toHaveBeenCalledWith([{ query: [2], topic: 'region' }]);
  });
});
