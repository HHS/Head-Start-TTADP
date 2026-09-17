import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import useFilters from '../../../../hooks/useFilters';
import UserContext from '../../../../UserContext';
import TtaRequest from '../TtaRequest';

jest.mock('../../../../hooks/useFilters');

const user = { homeRegionId: 1 };
const onApplyFilters = jest.fn();
const onRemoveFilter = jest.fn();

const renderTtaRequest = () =>
  render(
    <UserContext.Provider value={{ user }}>
      <MemoryRouter>
        <TtaRequest />
      </MemoryRouter>
    </UserContext.Provider>
  );

describe('Recipient Record - TTA Request', () => {
  beforeEach(() => {
    useFilters.mockReturnValue({
      filters: [],
      onApplyFilters,
      onRemoveFilter,
      filterConfig: [],
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the filter panel', () => {
    renderTtaRequest();

    expect(screen.getByTestId('tta-request-filter-panel')).toBeVisible();
    expect(screen.getByRole('button', { name: /open filters for this page/i })).toBeVisible();
  });

  it('sets up filters without region management', () => {
    renderTtaRequest();

    expect(useFilters).toHaveBeenCalledWith(user, 'tta-request-filters', false, [], []);
  });
});
