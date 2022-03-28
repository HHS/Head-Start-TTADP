import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FilterPanel from '../FilterPanel';
import UserContext from '../../../UserContext';
import { formatDateRange } from '../../../utils';
import { LANDING_FILTER_CONFIG_WITH_REGIONS } from '../../../pages/Landing/constants';
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
    allUserRegions = [1],
    onApplyFilters = jest.fn(),
    onRemoveFilter = jest.fn(),
    filterConfig = LANDING_FILTER_CONFIG_WITH_REGIONS,
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
            allUserRegions={allUserRegions}
          />
        </div>
      </UserContext.Provider>,
    );
  };
  it('Removing last region pill adds back all regions', async () => {
    const filters = [{
      id: 1,
      topic: 'region',
      condition: 'is',
      query: 1,
    },
    {
      id: 2,
      topic: 'startDate',
      condition: 'is within',
      query: defaultDate,
    }];
    const onRemovePill = jest.fn();
    const onApplyFilters = jest.fn();
    const userAllRegions = [1, 2];
    renderFilterPanel(filters, userAllRegions, onApplyFilters, onRemovePill);

    // Remove region pill.
    const regionPill = await screen.findByRole('button', { name: /this button removes the filter: region is 1/i });
    userEvent.click(regionPill);

    // Verify adds back all regions.
    expect(onRemovePill).toHaveBeenCalledWith(1, true);
  });

  it('Removing the last region filter menu item adds back all regions', async () => {
    const filters = [{
      id: 1,
      topic: 'region',
      condition: 'is',
      query: 1,
    },
    {
      id: 2,
      topic: 'startDate',
      condition: 'is within',
      query: defaultDate,
    }];
    const onRemovePill = jest.fn();
    const onApplyFilters = jest.fn();
    const userAllRegions = [1, 2];
    renderFilterPanel(filters, userAllRegions, onApplyFilters, onRemovePill);

    // Open filters.
    const filtersMenu = await screen.findByText(/filters \(2\)/i);
    userEvent.click(filtersMenu);

    // Remove region filter item.
    const regionItem = await screen.findByRole('button', { name: /remove region is 1 filter\. click apply filters to make your changes/i });
    userEvent.click(regionItem);

    // Apply filter change.
    const apply = await screen.findByRole('button', { name: /apply filters for activity reports/i });
    userEvent.click(apply);

    // Verify adds back all regions.
    expect(onApplyFilters).toHaveBeenCalledWith([{
      condition: 'is within', id: 2, query: defaultDate, topic: 'startDate',
    }], true);
  });

  it('Adding region filter via menu prevents adding back all regions', async () => {
    const filters = [
      {
        id: 1,
        topic: 'startDate',
        condition: 'is within',
        query: defaultDate,
      }];
    const onRemovePill = jest.fn();
    const onApplyFilters = jest.fn();
    const userAllRegions = [1, 2];
    renderFilterPanel(filters, userAllRegions, onApplyFilters, onRemovePill);

    // Open filters.
    const filtersMenu = await screen.findByText(/filters \(1\)/i);
    userEvent.click(filtersMenu);

    // Get filter group.
    const topic = await screen.findByRole('combobox', { name: /topic/i });
    userEvent.selectOptions(topic, 'region');

    const condition = await screen.findByRole('combobox', { name: 'condition' });
    userEvent.selectOptions(condition, 'is');

    // Apply filter change.
    const apply = await screen.findByRole('button', { name: /apply filters for activity reports/i });
    userEvent.click(apply);

    // Verify adds back all regions.
    expect(onApplyFilters).toHaveBeenCalledWith([{
      condition: 'is', id: 1, query: '1', topic: 'region',
    }], false);
  });

  it('Adding a filter with all users regions hides region pills', async () => {
    const filters = [
      {
        id: 1,
        topic: 'startDate',
        condition: 'is within',
        query: defaultDate,
      },
      {
        id: 2,
        topic: 'region',
        condition: 'is',
        query: 1,
      },
      {
        id: 3,
        topic: 'region',
        condition: 'is',
        query: 2,
      },
    ];
    const onRemovePill = jest.fn();
    const onApplyFilters = jest.fn();
    const userAllRegions = [1, 2];
    renderFilterPanel(filters, userAllRegions, onApplyFilters, onRemovePill);

    // Date filter pill exists.
    expect(await screen.findByRole('button', { name: /this button removes the filter: date started is within/i })).toBeVisible();

    // Region filter pills are hidden.
    expect(screen.queryByRole('button', { name: /this button removes the filter: region is 1/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /this button removes the filter: region is 2/i })).toBeNull();
  });

  it('Adding a filter with all users regions hides region filter menu items', async () => {
    const filters = [
      {
        id: 1,
        topic: 'startDate',
        condition: 'is within',
        query: defaultDate,
      },
      {
        id: 2,
        topic: 'region',
        condition: 'is',
        query: 1,
      },
      {
        id: 3,
        topic: 'region',
        condition: 'is',
        query: 2,
      },
    ];
    const onRemovePill = jest.fn();
    const onApplyFilters = jest.fn();
    const userAllRegions = [1, 2];
    renderFilterPanel(filters, userAllRegions, onApplyFilters, onRemovePill);

    // Verify menu contains one filter.
    expect(await screen.findByText(/filters \(1\)/i)).toBeVisible();

    // Open filters.
    const filtersMenu = await screen.findByText(/filters \(1\)/i);
    userEvent.click(filtersMenu);
    expect(screen.getAllByText(/date started/i).length).toBe(2);
  });
});
