import { showFilterWithMyRegions } from '../regionHelpers';

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

  it('handles alternate case', async () => {
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
    expect(setFilters).toHaveBeenCalledWith([{ query: 1 }, { query: 2 }]);
  });
});
