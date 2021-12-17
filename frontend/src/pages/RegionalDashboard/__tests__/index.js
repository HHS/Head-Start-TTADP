import '@testing-library/jest-dom';
import React from 'react';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import {
  act,
  render, screen, waitFor,
} from '@testing-library/react';
import fetchMock from 'fetch-mock';
import userEvent from '@testing-library/user-event';
import RegionalDashboard from '../index';

import { SCOPE_IDS } from '../../../Constants';
import UserContext from '../../../UserContext';

const history = createMemoryHistory();

describe('Regional Dashboard page', () => {
  beforeAll(async () => {
    fetchMock.mock('*', 200);
  });

  afterEach(async () => {

  });

  const renderDashboard = (user) => {
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
        regionId: 1,
        scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
      }, {
        regionId: 1,
        scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
      }],
    };
    renderDashboard(user);
    let heading = await screen.findByText(/regional tta activity dashboard/i);
    expect(heading).toBeVisible();

    act(async () => {
      userEvent.click(await screen.findByRole('button', { name: /This button removes the filter/i }));
      userEvent.click(await screen.findByRole('button', { name: /open filters for this page/i }));
      userEvent.click(await screen.findByRole('button', { name: /add new filter/i }));
      const [lastTopic] = Array.from(document.querySelectorAll('[name="topic"]')).slice(-1);
      userEvent.selectOptions(lastTopic, 'region');
      const [lastCondition] = Array.from(document.querySelectorAll('[name="condition"]')).slice(-1);
      userEvent.selectOptions(lastCondition, 'Is');
      userEvent.selectOptions(await screen.findByRole('combobox', { name: 'Select region to filter by' }), 'Region 1');
    });

    heading = await screen.findByText(/region 1 tta activity dashboard/i);
    expect(heading).toBeVisible();
  });

  it('shows the reason list widget', async () => {
    const user = {
      homeRegionId: 1,
      permissions: [{
        regionId: 1,
        scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
      }],
    };
    renderDashboard(user);

    await waitFor(() => {
      expect(screen.getByText(/reasons in activity reports/i)).toBeInTheDocument();
    });
  });
});
