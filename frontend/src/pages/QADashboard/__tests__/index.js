/* eslint-disable max-len */
import '@testing-library/jest-dom';
import React from 'react';
import { SCOPE_IDS } from '@ttahub/common';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import {
  render,
  screen,
} from '@testing-library/react';
import fetchMock from 'fetch-mock';

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
  const renderQADashboard = (user) => {
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
    renderQADashboard(defaultUser);

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
});
