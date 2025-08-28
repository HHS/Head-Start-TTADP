/* eslint-disable react/prop-types */
import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
} from '@testing-library/react';
import { Router } from 'react-router';
import { SCOPE_IDS } from '@ttahub/common';
import fetchMock from 'fetch-mock';
import { createMemoryHistory } from 'history';
import { mockWindowProperty } from '../../../testHelpers';
import CollaborationReportForm from '..';
import AppLoadingContext from '../../../AppLoadingContext';
import UserContext from '../../../UserContext';

const history = createMemoryHistory();

const user = {
  id: 1,
  name: 'Walter Burns',
  roles: [{ fullName: 'Reporter' }],
  permissions: [
    { regionId: 1, scopeId: SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS },
  ],
};

const ReportComponent = ({
  id,
  currentPage = 'activity-summary',
  showLastUpdatedTime = null,
  userId = 1,
}) => (
  <Router history={history}>
    <AppLoadingContext.Provider value={{ setAppLoading: jest.fn(), setAppLoadingText: jest.fn() }}>
      <UserContext.Provider value={{ user: { ...user, id: userId, flags: [] } }}>
        <CollaborationReportForm
          match={{ params: { currentPage, collabReportId: id }, path: '', url: '' }}
          location={{
            state: { showLastUpdatedTime }, hash: '', pathname: '', search: '',
          }}
          region={1}
        />
      </UserContext.Provider>
    </AppLoadingContext.Provider>
  </Router>
);

describe('CollaborationReportForm', () => {
  const setItem = jest.fn();
  const getItem = jest.fn();
  const removeItem = jest.fn();

  mockWindowProperty('localStorage', {
    setItem,
    getItem,
    removeItem,
  });

  beforeEach(() => {
    fetchMock.get('/api/users/collaborators?region=1', []);
  });

  afterEach(() => {
    fetchMock.restore();
    jest.clearAllMocks();
  });

  it('renders', async () => {
    render(<ReportComponent id="new" />);

    const heading = await screen.findByText('Collaboration report for Region');
    expect(heading).toBeInTheDocument();
  });
});
