import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { SCOPE_IDS } from '@ttahub/common';
import fetchMock from 'fetch-mock';
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
  filters: [{ id: '1', topic: 'region', condition: 'is', query: '1' }],
  setFilters: jest.fn(),
  onApplyFilters,
  onRemoveFilter,
  filterConfig: [],
};

// read access to region 1, the region the page is filtered to
const user = {
  homeRegionId: 1,
  permissions: [{ regionId: 1, scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS }],
};

const DRAFT = {
  id: 7,
  displayId: 'R01-REQ-7',
  regionId: 1,
  recipientId: 9,
  status: 'draft',
  createdAt: '2026-10-01T16:00:00.000Z',
  creator: { id: 1, name: 'Rachel Green' },
  reviewer: null,
  recipient: { id: 9, name: 'Children and Families First' },
  goalTemplate: null,
  grants: [],
};

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
    fetchMock.get('begin:/api/tta-requests?', { count: 1, rows: [DRAFT] });
  });

  afterEach(() => {
    fetchMock.restore();
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

    expect(screen.getByRole('link', { name: /add request/i })).toHaveAttribute(
      'href',
      '/tta-requests/new'
    );
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
  it('renders both request tables', () => {
    renderTtaRequests();

    expect(screen.getByRole('heading', { name: 'Active TTA requests', level: 2 })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Approved TTA requests', level: 2 })).toBeVisible();
  });

  it("lists the requests in the page's filtered regions", async () => {
    renderTtaRequests();

    expect(await screen.findByRole('link', { name: 'R01-REQ-7' })).toBeVisible();
    expect(fetchMock.lastUrl('begin:/api/tta-requests?')).toBe('/api/tta-requests?region.in[]=1');
  });

  it('names the recipient and region of each active request', async () => {
    renderTtaRequests();

    // the page spans every region the user can see, so the rows have to say which
    expect(await screen.findByRole('columnheader', { name: /recipient/i })).toBeVisible();
    expect(screen.getByRole('columnheader', { name: /region/i })).toBeVisible();
  });
});
