import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import useFilters from '../../../hooks/useFilters';
import UserContext from '../../../UserContext';
import TtaRequests from '../index';

jest.mock('../../../hooks/useFilters');

const onApplyFilters = jest.fn();
const onRemoveFilter = jest.fn();

const defaultFilterReturn = {
  regions: [1],
  defaultRegion: 1,
  allRegionsFilters: [],
  hasMultipleRegions: false,
  filters: [],
  setFilters: jest.fn(),
  onApplyFilters,
  onRemoveFilter,
  filterConfig: [],
};

const user = { homeRegionId: 1, permissions: [] };

const renderTtaRequests = () =>
  render(
    <UserContext.Provider value={{ user }}>
      <MemoryRouter>
        <TtaRequests />
      </MemoryRouter>
    </UserContext.Provider>
  );

describe('TTA Requests', () => {
  beforeEach(() => {
    useFilters.mockReturnValue(defaultFilterReturn);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the heading with the singular region label', () => {
    renderTtaRequests();

    expect(
      screen.getByRole('heading', { name: 'TTA requests - your region', level: 1 })
    ).toBeVisible();
  });

  it('renders the heading with the plural region label for multiple regions', () => {
    useFilters.mockReturnValue({
      ...defaultFilterReturn,
      regions: [1, 2],
      hasMultipleRegions: true,
    });

    renderTtaRequests();

    expect(
      screen.getByRole('heading', { name: 'TTA requests - your regions', level: 1 })
    ).toBeVisible();
  });

  it('renders the heading with the plural region label for central office', () => {
    useFilters.mockReturnValue({ ...defaultFilterReturn, defaultRegion: 14 });

    renderTtaRequests();

    expect(
      screen.getByRole('heading', { name: 'TTA requests - your regions', level: 1 })
    ).toBeVisible();
  });

  it('renders the add request button', () => {
    renderTtaRequests();

    expect(screen.getByRole('button', { name: /add request/i })).toBeVisible();
  });

  it('renders the filter panel', () => {
    renderTtaRequests();

    expect(screen.getByTestId('tta-requests-filter-panel')).toBeVisible();
    expect(screen.getByRole('button', { name: /open filters for this page/i })).toBeVisible();
  });

  it('sets up filters with region management', () => {
    renderTtaRequests();

    expect(useFilters).toHaveBeenCalledWith(user, 'tta-requests-filters', true, [], []);
  });
});
