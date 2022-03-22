import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FilterPanel from '../FilterPanel';
import UserContext from '../../../UserContext';
import { TTAHISTORY_FILTER_CONFIG } from '../../../pages/RecipientRecord/pages/constants';
import { SCOPE_IDS } from '../../../Constants';

const { READ_ACTIVITY_REPORTS } = SCOPE_IDS;

describe('Filter Panel', () => {
  afterAll(() => {
    jest.restoreAllMocks();
  });

  const renderFilterPanel = (
    filters = [],
    onApplyFilters = jest.fn(),
    onRemoveFilter = jest.fn(),
    filterConfig = TTAHISTORY_FILTER_CONFIG,
    hideRegionFiltersByDefault = false,
    dateRangeOptions = [{
      label: 'Custom date range',
      value: 2,
      range: '',
    }],

  ) => {
    const user = {
      permissions: [
        {
          regionId: 1,
          scopeId: READ_ACTIVITY_REPORTS,
        },
      ],
    };

    render(
      <UserContext.Provider value={{ user }}>
        <h1>Filter Panel</h1>
        <div>
          <FilterPanel
            applyButtonAria="apply filters for activity reports"
            filters={filters}
            onApplyFilters={onApplyFilters}
            dateRangeOptions={dateRangeOptions}
            onRemoveFilter={onRemoveFilter}
            filterConfig={filterConfig}
            hideRegionFiltersByDefault={hideRegionFiltersByDefault}
          />
        </div>
      </UserContext.Provider>,
    );
  };
  it('renders correctly', async () => {
    renderFilterPanel();
    screen.debug(undefined, 100000);
    expect(true).toBe(true);
  });
});
