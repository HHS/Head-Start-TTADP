/* eslint-disable react/prop-types */
import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen,
} from '@testing-library/react';
import { v4 as uuidv4 } from 'uuid';
import userEvent from '@testing-library/user-event';
import RegionPermissionModal from '../RegionPermissionModal';
import { formatDateRange } from '../../utils';

const defaultDate = formatDateRange({
  lastThirtyDays: true,
  forDateTime: true,
});

const defaultUser = {
  name: 'test@test.com',
  homeRegionId: 1,
  permissions: [
    {
      scopeId: 3,
      regionId: 1,
    },
    {
      scopeId: 3,
      regionId: 2,
    },
  ],
};

const defaultFilters = [{
  id: uuidv4(),
  topic: 'startDate',
  condition: 'is within',
  query: defaultDate,
}];

const PermissionModal = (
  {
    filters = defaultFilters,
    user = defaultUser,
    showFilterWithMyRegions = () => { },
  },
) => (
  <div>
    <RegionPermissionModal
      filters={filters}
      user={user}
      showFilterWithMyRegions={showFilterWithMyRegions}
    />
  </div>
);

describe('Region Permission Modal', () => {
  it('correctly shows the modal', async () => {
    const filtersToPass = [
      ...defaultFilters,
      {
        id: uuidv4(),
        topic: 'region',
        condition: 'is',
        query: 1,
      },
      {
        id: uuidv4(),
        topic: 'region',
        condition: 'is',
        query: 2,
      },
      {
        id: uuidv4(),
        topic: 'region',
        condition: 'is',
        query: 3,
      },
    ];

    render(<PermissionModal filters={filtersToPass} />);

    // Check modal is visible.
    const modalElement = document.querySelector('.popup-modal');
    expect(modalElement.firstChild).toHaveClass('is-visible');
  });

  it('correctly hides the modal', async () => {
    const filtersToPass = [
      ...defaultFilters,
      {
        id: uuidv4(),
        topic: 'region',
        condition: 'is',
        query: 1,
      },
      {
        id: uuidv4(),
        topic: 'region',
        condition: 'is',
        query: 2,
      },
    ];

    render(<PermissionModal filters={filtersToPass} />);

    // Check modal is visible.
    const modalElement = document.querySelector('.popup-modal');
    expect(modalElement.firstChild).toHaveClass('is-hidden');
  });

  it('correctly shows filters with my regions', async () => {
    const filtersToPass = [
      ...defaultFilters,
      {
        id: uuidv4(),
        topic: 'region',
        condition: 'is',
        query: 1,
      },
      {
        id: uuidv4(),
        topic: 'region',
        condition: 'is',
        query: 2,
      },
      {
        id: uuidv4(),
        topic: 'region',
        condition: 'is',
        query: 3,
      },
    ];

    const showFiltersFn = jest.fn();
    render(<PermissionModal filters={filtersToPass} showFilterWithMyRegions={showFiltersFn} />);

    // Click show filters with my regions.
    const showFiltersBtn = await screen.findByRole('button', { name: /show filter with my regions/i, hidden: true });
    userEvent.click(showFiltersBtn);
    expect(showFiltersFn).toHaveBeenCalled();

    // Modal has closed.
    const modalElement = document.querySelector('.popup-modal');
    expect(modalElement.firstChild).toHaveClass('is-hidden');
  });

  it('correctly shows filters with my regions when smart sheet button clicked', async () => {
    const filtersToPass = [
      ...defaultFilters,
      {
        id: uuidv4(),
        topic: 'region',
        condition: 'is',
        query: 1,
      },
      {
        id: uuidv4(),
        topic: 'region',
        condition: 'is',
        query: 2,
      },
      {
        id: uuidv4(),
        topic: 'region',
        condition: 'is',
        query: 3,
      },
    ];

    const showFiltersFn = jest.fn();
    render(<PermissionModal filters={filtersToPass} showFilterWithMyRegions={showFiltersFn} />);

    // Click show filters with my regions.
    const showFiltersBtn = await screen.findByRole('button', { name: /request access via smartsheet/i, hidden: true });
    userEvent.click(showFiltersBtn);
    expect(showFiltersFn).toHaveBeenCalled();

    // Modal has closed.
    const modalElement = document.querySelector('.popup-modal');
    expect(modalElement.firstChild).toHaveClass('is-hidden');
  });
});
