import React from 'react';
import fetchMock from 'fetch-mock';
import { createMemoryHistory } from 'history';
import { MemoryRouter, Route } from 'react-router';
import {
  render, waitFor, screen, act,
} from '@testing-library/react';
import { SCOPE_IDS } from '@ttahub/common';
import UserContext from '../../../UserContext';
import RegionalCommunicationLog from '..';
import AppLoadingContext from '../../../AppLoadingContext';

describe('RegionalCommunicationLogDashboard', () => {
  const userCentralOffice = {
    homeRegionId: 14,
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
            <Route path="/regional-communication-log">
              <RegionalCommunicationLog />
            </Route>
          </UserContext.Provider>
        </AppLoadingContext.Provider>
      </MemoryRouter>,
    );
  };

  const defaultURL = '/api/communication-logs/region?sortBy=communicationDate&direction=desc&offset=0&limit=10&format=json&communicationDate.win=2022%2F07%2F01-2025%2F02%2F04';

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
    act(() => renderComm(userCentralOffice, '/regional-communication-log'));
    expect(await screen.findByRole('heading', { name: /Communication logs - your region/i })).toBeInTheDocument();
  });

  it('renders the page - user with two regions', async () => {
    act(() => renderComm(userWithTwoRegions, '/regional-communication-log'));
    expect(await screen.findByRole('heading', { name: /Communication logs - your regions/i })).toBeInTheDocument();
  });

  it('tries to fetch data', async () => {
    act(() => renderComm(userCentralOffice, '/regional-communication-log'));
    expect(fetchMock.called(defaultURL)).toBe(true);
  });

  it('shows the table, and the table has data', async () => {
    act(() => renderComm(userCentralOffice, '/regional-communication-log'));
    await waitFor(() => expect(screen.getByRole('button', { name: /log id\. activate to sort ascending/i })).toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole('link', { name: 'R01-CL-0001' })).toBeInTheDocument());
  });

  it('has the communication date filter applied by default', async () => {
    act(() => renderComm(userCentralOffice, '/regional-communication-log'));
    await waitFor(() => expect(screen.getByRole('button', { name: /this button removes the filter: communication date is within 07\/01\/2022-02\/04\/2025/i })).toBeInTheDocument());
  });

  it('shows an empty state for no logs', async () => {
    fetchMock.get(defaultURL, { count: 0, rows: [] }, { overwriteRoutes: true });
    act(() => renderComm(userCentralOffice, '/regional-communication-log'));
    await waitFor(() => expect(screen.getByText(/you haven't logged any communication yet\./i)).toBeInTheDocument());
  });
});
