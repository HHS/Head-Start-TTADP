import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import fetchMock from 'fetch-mock';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import useFilters from '../../../../hooks/useFilters';
import UserContext from '../../../../UserContext';
import TtaRequest from '../TtaRequest';

jest.mock('../../../../hooks/useFilters');

const user = { homeRegionId: 1 };
const RECIPIENT_REQUESTS_URL = '/api/tta-requests/region/2/recipient/45';
const onApplyFilters = jest.fn();
const onRemoveFilter = jest.fn();

const renderTtaRequest = () =>
  render(
    <UserContext.Provider value={{ user }}>
      <MemoryRouter>
        <TtaRequest recipientId="45" regionId="2" />
      </MemoryRouter>
    </UserContext.Provider>
  );

describe('Recipient Record - TTA Requests', () => {
  beforeEach(() => {
    useFilters.mockReturnValue({
      filters: [],
      onApplyFilters,
      onRemoveFilter,
      filterConfig: [],
    });
    fetchMock.get(RECIPIENT_REQUESTS_URL, {
      count: 1,
      rows: [
        {
          id: 7,
          displayId: 'R02-REQ-7',
          regionId: 2,
          recipientId: 45,
          status: 'draft',
          createdAt: '2026-10-01T16:00:00.000Z',
          creator: { id: 1, name: 'Rachel Green' },
          reviewer: null,
          recipient: { id: 45, name: 'Children and Families First' },
          goalTemplate: null,
          grants: [],
        },
      ],
    });
  });

  afterEach(() => {
    fetchMock.restore();
    jest.clearAllMocks();
  });

  it('renders the filter panel', () => {
    renderTtaRequest();

    expect(screen.getByTestId('tta-request-filter-panel')).toBeVisible();
    expect(screen.getByRole('button', { name: /open filters for this page/i })).toBeVisible();
  });

  it("renders the active and approved TTA requests tables, with the recipient's requests", async () => {
    renderTtaRequest();

    expect(screen.getByRole('heading', { name: 'Active TTA requests' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Approved TTA requests' })).toBeVisible();
    expect(await screen.findByRole('link', { name: 'R02-REQ-7' })).toBeVisible();
    expect(fetchMock.called(RECIPIENT_REQUESTS_URL)).toBe(true);
  });

  it('sets up filters without region management', () => {
    renderTtaRequest();

    expect(useFilters).toHaveBeenCalledWith(user, 'tta-request-filters', false, [], []);
  });
});
