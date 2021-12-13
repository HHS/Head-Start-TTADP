import '@testing-library/jest-dom';
import React from 'react';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import {
  render, screen, waitFor,
} from '@testing-library/react';
import fetchMock from 'fetch-mock';
import userEvent from '@testing-library/user-event';
import RegionalDashboard from '../index';

import { SCOPE_IDS } from '../../../Constants';
import UserContext from '../../../UserContext';

describe('Regional Dashboard page', () => {
  beforeAll(() => {
    fetchMock.mock('*', 200);
  });

  const renderDashboard = (user) => {
    const history = createMemoryHistory();
    render(
      <UserContext.Provider value={user}>
        <Router history={history}>
          <RegionalDashboard user={user} />
        </Router>
      </UserContext.Provider>,
    );
  };

  it('shows a heading', async () => {
    const user = {
      homeRegionId: 14,
      permissions: [{
        regionId: 14,
      }],
    };
    renderDashboard(user);
    const heading = await screen.findByText(/regional tta activity dashboard/i);
    expect(heading).toBeInTheDocument();
  });

  it('shows the selected region', async () => {
    const user = {
      homeRegionId: 1,
      permissions: [
        {
          regionId: 1,
          scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
        },
        {
          regionId: 2,
          scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
        },
        {
          regionId: 14,
          scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
        },
      ],
    };
    renderDashboard(user);

    expect(screen.getByText('Region 1 TTA Activity Dashboard')).toBeInTheDocument();
  });

  it('renders a loading div when no user is provided', async () => {
    renderDashboard(null);
    expect(await screen.findByText(/loading\.\.\./i)).toBeInTheDocument();
  });

  it('shows the reason list widget', async () => {
    const user = {
      homeRegionId: 14,
      permissions: [{
        regionId: 14,
      }],
    };
    renderDashboard(user);

    await waitFor(() => {
      expect(screen.getByText(/reasons in activity reports/i)).toBeInTheDocument();
    });
  });

  it('opens the filter menu', async () => {
    const user = {
      homeRegionId: 14,
      permissions: [{
        regionId: 14,
      }],
    };
    renderDashboard(user);

    userEvent.click(await screen.findByRole('button', { name: /This button removes the filter/i }));
    userEvent.click(await screen.findByRole('button', { name: /open filters for this page/i }));
    expect(document.querySelectorAll('[name="topic"]').length).toBe(1);
  });
});
