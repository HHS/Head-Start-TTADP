/* eslint-disable react/jsx-props-no-spreading */

import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import AppLoadingContext from '../../../AppLoadingContext';
import { NOOP } from '../../../Constants';
import FilterContext from '../../../FilterContext';
import { getAlerts, getReports } from '../../../fetchers/collaborationReports';
import UserContext from '../../../UserContext';
import CollabReports from '../components/CollabReports';

jest.mock('../../../fetchers/collaborationReports');

describe('CollabReports', () => {
  const mockReports = [
    { id: 1, name: 'Report 1', regionId: 1 },
    { id: 2, name: 'Report 2', regionId: 1 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderTest = (props) => {
    render(
      <AppLoadingContext.Provider value={{ setIsAppLoading: NOOP }}>
        <UserContext.Provider value={{ user: { id: 1 } }}>
          <CollabReports {...props} />
        </UserContext.Provider>
      </AppLoadingContext.Provider>
    );
  };

  test('Renders loading state and then reports table', async () => {
    getReports.mockResolvedValue({ count: 0, rows: mockReports });

    renderTest({ title: 'Test Title' });

    expect(screen.getByText('Test Title')).toBeInTheDocument();

    await waitFor(() => {
      expect(getReports).toHaveBeenCalled();
      expect(screen.getByText('Test Title')).toBeInTheDocument();
    });
  });

  test('Renders empty message when no reports', async () => {
    getReports.mockResolvedValue({ count: 0, rows: [] });

    renderTest({ emptyMsg: 'No reports found' });

    await waitFor(() => {
      expect(getReports).toHaveBeenCalled();
      expect(screen.getByText('No reports found')).toBeInTheDocument();
    });
  });

  test('Renders error alert on fetch failure', async () => {
    getReports.mockRejectedValue(new Error('Network error'));

    renderTest();

    await waitFor(() => {
      expect(getReports).toHaveBeenCalled();
      expect(screen.getByRole('alert')).toHaveTextContent('Unable to fetch reports');
    });
  });

  test('Passes showCreateMsgOnEmpty prop to table', async () => {
    getReports.mockResolvedValue({ count: 0, rows: [] });

    renderTest({ showCreateMsgOnEmpty: true });

    await waitFor(() => {
      expect(getReports).toHaveBeenCalled();
      // The empty message should still be present
      expect(screen.getByText('You have no Collaboration Reports')).toBeInTheDocument();
    });
  });

  test('initializes sort config with perPage: 10', async () => {
    getReports.mockResolvedValue({ count: 0, rows: [] });
    renderTest({});
    await waitFor(() => {
      expect(getReports).toHaveBeenCalledWith(expect.objectContaining({ perPage: 10 }), []);
    });
  });

  test('Passes isAlerts prop to table', async () => {
    getAlerts.mockResolvedValue({ count: 0, rows: [] });

    renderTest({ isAlerts: true });

    await waitFor(() => {
      expect(getAlerts).toHaveBeenCalled();
      // The empty message should still be present
      expect(screen.getByText('You have no Collaboration Reports')).toBeInTheDocument();
    });
  });

  test('preserves the saved page when returning to the reports table', async () => {
    const filterKey = 'collab-pagination-test';
    const savedSort = { sortBy: 'id', direction: 'desc', activePage: 3, offset: 20, perPage: 10 };
    sessionStorage.setItem(filterKey, '[]');
    sessionStorage.setItem(`${filterKey}-collabReportsTable-sorting`, JSON.stringify(savedSort));
    getReports.mockResolvedValue({ count: 30, rows: [] });

    const renderTable = (filters) => (
      <FilterContext.Provider value={{ filterKey }}>
        <AppLoadingContext.Provider value={{ setIsAppLoading: NOOP }}>
          <UserContext.Provider value={{ user: { id: 1 } }}>
            <CollabReports filters={filters} />
          </UserContext.Provider>
        </AppLoadingContext.Provider>
      </FilterContext.Provider>
    );
    const { unmount, rerender } = render(renderTable([]));

    await waitFor(() => {
      expect(getReports).toHaveBeenLastCalledWith(
        expect.objectContaining({ activePage: 3, offset: 20 }),
        []
      );
    });

    rerender(renderTable([]));
    expect(getReports).toHaveBeenLastCalledWith(
      expect.objectContaining({ activePage: 3, offset: 20 }),
      []
    );

    const filters = [{ id: 'region', topic: 'region', condition: 'is', query: '1' }];
    rerender(renderTable(filters));
    await waitFor(() => {
      expect(getReports).toHaveBeenLastCalledWith(
        expect.objectContaining({ activePage: 1, offset: 0 }),
        filters
      );
    });

    unmount();
    sessionStorage.removeItem(filterKey);
    sessionStorage.removeItem(`${filterKey}-collabReportsTable-sorting`);
  });
});
