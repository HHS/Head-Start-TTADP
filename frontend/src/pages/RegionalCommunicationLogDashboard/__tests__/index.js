import React from 'react';
import fetchMock from 'fetch-mock';
import { createMemoryHistory } from 'history';
import { MemoryRouter, Route, useHistory } from 'react-router';
import {
  render, waitFor, screen, act,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SCOPE_IDS } from '@ttahub/common';
import UserContext from '../../../UserContext';
import RegionalCommunicationLog from '..';
import AppLoadingContext from '../../../AppLoadingContext';

jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useHistory: jest.fn(),
}));

describe('RegionalCommunicationLogDashboard', () => {
  const userCentralOffice = {
    id: 1,
    homeRegionId: 14,
    permissions: [{
      regionId: 1,
      scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
    }],
  };

  const userOneRegionNoCentralOffice = {
    homeRegionId: 1,
    permissions: [{
      regionId: 1,
      scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
    }],
  };

  const userWithTwoRegions = {
    homeRegionId: 14,
    permissions: [{
      regionId: 1,
      scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
    }, {
      regionId: 2,
      scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
    }],
  };

  const userWithTwoRegionsAndNoCentralOffice = {
    homeRegionId: 1,
    permissions: [{
      regionId: 1,
      scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
    }, {
      regionId: 2,
      scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
    }],
  };
  const history = createMemoryHistory();

  const renderComm = (u, route) => {
    history.push(route);
    const user = u || userCentralOffice;
    render(
      <MemoryRouter initialEntries={[route]}>
        <AppLoadingContext.Provider value={{
          setIsAppLoading: jest.fn(),
          setAppLoadingText: jest.fn(),
        }}
        >
          <UserContext.Provider value={{ user }}>
            <Route path="/communication-log">
              <RegionalCommunicationLog />
            </Route>
          </UserContext.Provider>
        </AppLoadingContext.Provider>
      </MemoryRouter>,
    );
  };

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
  const currentDay = String(today.getDate()).padStart(2, '0');
  const defaultURL = `/api/communication-logs/region?sortBy=Log_ID&direction=desc&offset=0&limit=10&format=json&communicationDate.win=2022%2F07%2F01-${currentYear}%2F${currentMonth}%2F${currentDay}`;

  beforeEach(() => {
    jest.restoreAllMocks();
    fetchMock.restore();
    const logs = {
      count: 1,
      rows: [
        {
          id: 1,
          displayId: 'R01-CL-0001',
          userId: 1,
          data: {
            regionId: 4,
            communicationDate: '2023-01-01',
            purpose: 'Purpose',
            goals: [{ label: 'Goal' }],
            otherStaff: [{ label: 'Other Staff' }],
            result: 'A great result',
          },
          authorName: 'Author',
          recipients: [{ id: 1 }],
        },
      ],
    };
    fetchMock.get(defaultURL, logs);
  });

  afterEach(() => {
    fetchMock.reset();
  });

  it('renders the page - user with one region', async () => {
    act(() => renderComm(userCentralOffice, '/communication-log'));
    expect(await screen.findByRole('heading', { name: /Communication logs - your region/i })).toBeInTheDocument();
  });

  it('renders the page - user with two regions', async () => {
    act(() => renderComm(userWithTwoRegions, '/communication-log'));
    expect(await screen.findByRole('heading', { name: /Communication logs - your regions/i })).toBeInTheDocument();
  });

  // Really just for coverage purposes (see @createDefaultFilters)
  it('renders the page - user with one region and no central office', async () => {
    act(() => renderComm(userOneRegionNoCentralOffice, '/communication-log'));
    expect(await screen.findByRole('heading', { name: /Communication logs - your region/i })).toBeInTheDocument();
  });

  // Really just for coverage purposes (see @createDefaultFilters)
  it('renders the page - user with two regions and no central office', async () => {
    act(() => renderComm(userWithTwoRegionsAndNoCentralOffice, '/communication-log'));
    expect(await screen.findByRole('heading', { name: /Communication logs - your regions/i })).toBeInTheDocument();
  });

  it('tries to fetch data', async () => {
    act(() => renderComm(userCentralOffice, '/communication-log'));
    expect(fetchMock.called(defaultURL)).toBe(true);
  });

  it('shows the table, and the table has data', async () => {
    act(() => renderComm(userCentralOffice, '/communication-log'));
    await waitFor(() => expect(screen.getByRole('button', { name: /log id\. activate to sort ascending/i })).toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole('link', { name: 'R01-CL-0001' })).toBeInTheDocument());
  });

  it('has the communication date filter applied by default', async () => {
    act(() => renderComm(userCentralOffice, '/communication-log'));
    await waitFor(() => expect(screen.getByRole('button', { name: /this button removes the filter: communication date is within/i })).toBeInTheDocument());
  });

  it('shows an empty state for no logs', async () => {
    fetchMock.get(defaultURL, { count: 0, rows: [] }, { overwriteRoutes: true });
    act(() => renderComm(userCentralOffice, '/communication-log'));
    await waitFor(() => expect(screen.getByText(/you haven't logged any communication yet\./i)).toBeInTheDocument());
  });

  it('has an actions menu with View and Delete - can Delete', async () => {
    act(() => renderComm(userCentralOffice, '/communication-log'));
    await waitFor(() => expect(screen.getByRole('button', { name: /log id\. activate to sort ascending/i })).toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole('link', { name: 'R01-CL-0001' })).toBeInTheDocument());

    const actions = screen.getByRole('button', { name: 'Actions for R01-CL-0001' });
    act(() => userEvent.click(actions));

    await waitFor(() => expect(screen.getByRole('menuitem', { name: /view/i })).toBeInTheDocument());
    await waitFor(() => expect(screen.getAllByRole('button', { name: /delete/i })[0]).toBeInTheDocument());

    // click delete
    const deleteMenuItemButton = screen.getAllByRole('button', { name: /delete/i })[0];
    act(() => userEvent.click(deleteMenuItemButton));

    // handle modal
    await waitFor(() => expect(screen.getByRole('heading', { name: /are you sure you want to delete this log\?/i })).toBeInTheDocument());
    const confirmDeleteButton = await screen.findByRole('button', { name: /confirm delete and reload page/i });
    expect(confirmDeleteButton).toBeVisible();

    const deleteURL = '/api/communication-logs/log/1';
    fetchMock.delete(deleteURL, 204);

    // confirm delete
    act(() => userEvent.click(confirmDeleteButton));
    await waitFor(() => expect(fetchMock.called(deleteURL)).toBe(true));
  });

  it('handles delete error', async () => {
    act(() => renderComm(userCentralOffice, '/communication-log'));
    await waitFor(() => expect(screen.getByRole('button', { name: /log id\. activate to sort ascending/i })).toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole('link', { name: 'R01-CL-0001' })).toBeInTheDocument());

    const actions = screen.getByRole('button', { name: 'Actions for R01-CL-0001' });
    act(() => userEvent.click(actions));

    // click delete
    const deleteMenuItemButton = screen.getAllByRole('button', { name: /delete/i })[0];
    act(() => userEvent.click(deleteMenuItemButton));

    // handle modal
    await waitFor(() => expect(screen.getByRole('heading', { name: /are you sure you want to delete this log\?/i })).toBeInTheDocument());
    const confirmDeleteButton = await screen.findByRole('button', { name: /confirm delete and reload page/i });
    expect(confirmDeleteButton).toBeVisible();

    const deleteURL = '/api/communication-logs/log/1';
    fetchMock.delete(deleteURL, 500);

    // confirm delete
    act(() => userEvent.click(confirmDeleteButton));
    await waitFor(() => expect(fetchMock.called(deleteURL)).toBe(true));
  });

  it('has an actions menu with View and Delete - can View', async () => {
    const push = jest.fn();
    useHistory.mockReturnValue({ push });

    act(() => renderComm(userCentralOffice, '/communication-log'));
    await waitFor(() => expect(screen.getByRole('button', { name: /log id\. activate to sort ascending/i })).toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole('link', { name: 'R01-CL-0001' })).toBeInTheDocument());

    const actions = screen.getByRole('button', { name: 'Actions for R01-CL-0001' });
    act(() => userEvent.click(actions));

    await waitFor(() => expect(screen.getAllByRole('button', { name: /view/i })[0]).toBeInTheDocument());
    await waitFor(() => expect(screen.getAllByRole('button', { name: /delete/i })[0]).toBeInTheDocument());

    const viewMenuItemButton = screen.getAllByRole('button', { name: /view/i })[0];
    act(() => userEvent.click(viewMenuItemButton));

    expect(push).toHaveBeenCalledWith('/communication-log/region/4/log/1/view');
  });

  it('lets you apply a filter', async () => {
    act(() => renderComm(userCentralOffice, '/communication-log'));
    const open = await screen.findByRole('button', { name: /open filters for this page/i });
    act(() => userEvent.click(open));
    await waitFor(() => expect(screen.getByRole('button', { name: /apply filters for regional communication log dashboard/i })).toBeInTheDocument());

    const [lastTopic] = Array.from(document.querySelectorAll('[name="topic"]')).slice(-1);
    act(() => userEvent.selectOptions(lastTopic, 'communicationDate'));
    const [lastCondition] = Array.from(document.querySelectorAll('[name="condition"]')).slice(-1);
    act(() => userEvent.selectOptions(lastCondition, 'is'));

    const select = screen.getByRole('combobox', { name: /date/i });
    await userEvent.click(select);
    act(() => userEvent.selectOptions(select, 'Year to date'));

    const filterURL = `/api/communication-logs/region?sortBy=Log_ID&direction=desc&offset=0&limit=10&format=json&communicationDate.in[]=${currentYear}%2F01%2F01-${currentYear}%2F${currentMonth}%2F${currentDay}`;
    fetchMock.get(filterURL, { count: 0, rows: [] });

    const apply = screen.getByRole('button', { name: /apply filters for regional communication log dashboard/i });
    act(() => userEvent.click(apply));

    expect(fetchMock.called(filterURL)).toBe(true);
  });

  it('does not show the region filter when the user has only one region', async () => {
    act(() => renderComm(userCentralOffice, '/communication-log'));
    const open = await screen.findByRole('button', { name: /open filters for this page/i });
    act(() => userEvent.click(open));
    await waitFor(() => expect(screen.getByRole('button', { name: /apply filters for regional communication log dashboard/i })).toBeInTheDocument());

    const [lastTopic] = Array.from(document.querySelectorAll('[name="topic"]')).slice(-1);
    expect(lastTopic.innerHTML).not.toContain('region');
  });

  it('does show the region filter when the user has two regions', async () => {
    act(() => renderComm(userWithTwoRegions, '/communication-log'));
    const open = await screen.findByRole('button', { name: /open filters for this page/i });
    act(() => userEvent.click(open));
    await waitFor(() => expect(screen.getByRole('button', { name: /apply filters for regional communication log dashboard/i })).toBeInTheDocument());

    const [lastTopic] = Array.from(document.querySelectorAll('[name="topic"]')).slice(-1);
    expect(lastTopic.innerHTML).toContain('region');
  });

  it('allows you to remove a filter', async () => {
    act(() => renderComm(userWithTwoRegions, '/communication-log'));
    await waitFor(() => expect(screen.getByRole('button', { name: /this button removes the filter: communication date is/i })).toBeInTheDocument());
    const remove = screen.getByRole('button', { name: /this button removes the filter: communication date is/i });
    act(() => userEvent.click(remove));
    await waitFor(() => expect(screen.queryByRole('button', { name: /this button removes the filter: communication date is/i })).not.toBeInTheDocument());
  });

  it('shows an error message if the fetch fails', async () => {
    fetchMock.get(defaultURL, 404, { overwriteRoutes: true });
    act(() => renderComm(userCentralOffice, '/communication-log'));
    await waitFor(() => expect(screen.getByText(/error fetching communication logs/i)).toBeInTheDocument());
  });
});
