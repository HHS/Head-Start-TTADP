import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
} from '@testing-library/react';
import FilterPanel from '../FilterPanel';
import UserContext from '../../../UserContext';
import { formatDateRange } from '../../../utils';
import { LANDING_FILTER_CONFIG_WITH_REGIONS, LANDING_BASE_FILTER_CONFIG } from '../../../pages/Landing/constants';
import { SCOPE_IDS } from '../../../Constants';

const { READ_ACTIVITY_REPORTS } = SCOPE_IDS;

const defaultDate = formatDateRange({
  lastThirtyDays: true,
  forDateTime: true,
});

describe('Filter Panel', () => {
  afterAll(() => {
    jest.restoreAllMocks();
  });

  const renderFilterPanel = (
    filters = [],
    filterConfig = LANDING_FILTER_CONFIG_WITH_REGIONS,
    onApplyFilters = jest.fn(),
    onRemoveFilter = jest.fn(),
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
            onRemoveFilter={onRemoveFilter}
            filterConfig={filterConfig}
          />
        </div>
      </UserContext.Provider>,
    );
  };
  it('Passing region filters with no region config hides region items', async () => {
    const filters = [{
      id: 1,
      topic: 'region',
      condition: 'is',
      query: 1,
    },
    {
      id: 2,
      topic: 'region',
      condition: 'is',
      query: 2,
    },
    {
      id: 3,
      topic: 'startDate',
      condition: 'is within',
      query: defaultDate,
    }];
    renderFilterPanel(filters, LANDING_BASE_FILTER_CONFIG);
    expect(await screen.findByText(/filters \(1\)/i)).toBeVisible();
    expect(screen.getAllByText(/date started/i).length).toBe(2);
    expect(screen.queryByText(/region/i)).toBeNull();
  });

  it('Passing region filters with region config shows region items', async () => {
    const filters = [{
      id: 1,
      topic: 'region',
      condition: 'is',
      query: 1,
    },
    {
      id: 2,
      topic: 'region',
      condition: 'is',
      query: 2,
    },
    {
      id: 3,
      topic: 'startDate',
      condition: 'is within',
      query: defaultDate,
    }];
    renderFilterPanel(filters);
    expect(await screen.findByText(/filters \(3\)/i)).toBeVisible();
    expect(screen.getAllByText(/date started/i).length).toBe(2);
    expect(await screen.findByRole('button', { name: /this button removes the filter: region is 1/i })).toBeVisible();
    expect(await screen.findByRole('button', { name: /this button removes the filter: region is 2/i })).toBeVisible();
  });
});
