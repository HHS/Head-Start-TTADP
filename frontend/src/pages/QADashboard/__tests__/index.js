/* eslint-disable max-len */
import '@testing-library/jest-dom';
import React from 'react';
import { SCOPE_IDS } from '@ttahub/common';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import {
  render,
  screen,
  act,
} from '@testing-library/react';
import fetchMock from 'fetch-mock';
import userEvent from '@testing-library/user-event';
import QADashboard from '../index';
import UserContext from '../../../UserContext';
import AriaLiveContext from '../../../AriaLiveContext';

const history = createMemoryHistory();
const mockAnnounce = jest.fn();

const defaultUser = {
  homeRegionId: 14,
  permissions: [{
    regionId: 1,
    scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
  }, {
    regionId: 2,
    scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
  }],
};

describe('Resource Dashboard page', () => {
  afterEach(() => fetchMock.restore());
  const renderQADashboard = (user = defaultUser) => {
    render(
      <UserContext.Provider value={{ user }}>
        <AriaLiveContext.Provider value={{ announce: mockAnnounce }}>
          <Router history={history}>
            <QADashboard user={user} />
          </Router>
        </AriaLiveContext.Provider>
      </UserContext.Provider>,
    );
  };

  it('renders correctly', async () => {
    renderQADashboard();

    // Header
    expect(await screen.findByText('Quality assurance dashboard')).toBeVisible();

    // Overview
    expect(await screen.findByText('Recipients with no TTA')).toBeVisible();
    expect(await screen.findByText('Recipients with OHS standard FEI goal')).toBeVisible();
    expect(await screen.findByText('Recipients with OHS standard CLASS goal')).toBeVisible();

    // Assert test data.
    expect(await screen.findByText('2.52%')).toBeVisible();
    expect(await screen.findByText('73.25%')).toBeVisible();
    expect(await screen.findByText('14.26%')).toBeVisible();
  });
  it('removes region filter when user has only one region', async () => {
    const u = {
      homeRegionId: 14,
      permissions: [{
        regionId: 2,
        scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
      }],
    };
    renderQADashboard(u);

    // Header
    expect(await screen.findByText('Quality assurance dashboard')).toBeVisible();

    const filters = await screen.findByRole('button', { name: 'open filters for this page' });

    act(() => {
      userEvent.click(filters);
    });

    const select = await screen.findByLabelText(/select a filter/i);

    // expect select not to have "region" as an option
    const option = select.querySelector('option[value="region"]');
    expect(option).toBeNull();
  });
});
