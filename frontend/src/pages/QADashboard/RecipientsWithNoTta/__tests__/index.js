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

import RecipientsWithNoTta from '../index';
import UserContext from '../../../../UserContext';
import AriaLiveContext from '../../../../AriaLiveContext';

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

describe('Recipients with no tta page', () => {
  afterEach(() => fetchMock.restore());
  const renderTest = (user) => {
    render(
      <UserContext.Provider value={{ user }}>
        <AriaLiveContext.Provider value={{ announce: mockAnnounce }}>
          <Router history={history}>
            <RecipientsWithNoTta />
          </Router>
        </AriaLiveContext.Provider>
      </UserContext.Provider>,
    );
  };

  it('renders correctly', async () => {
    act(() => {
      renderTest(defaultUser);
    });

    expect(await screen.findByRole('heading', { name: 'Recipients with no TTA', level: 1 })).toBeVisible();
  });
});
