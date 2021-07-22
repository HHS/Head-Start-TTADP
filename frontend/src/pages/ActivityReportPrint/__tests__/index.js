import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
} from '@testing-library/react';

import fetchMock from 'fetch-mock';

import ActivityReportPrint from '../index';

describe('Activity report print and share view', () => {
  const report = {
    regionId: 45,
  };

  const user = {
    id: 2,
    permissions: [
      {
        regionId: 45,
        userId: 2,
        scopeId: 1,
      },
      {
        regionId: 45,
        userId: 2,
        scopeId: 2,
      },
      {
        regionId: 45,
        userId: 2,
        scopeId: 3,
      },
    ],
  };

  function renderActivityReportPrint() {
    const match = {
      path: '',
      url: '',
      params: {
        activityReportId: 5000,
      },
    };

    render(<ActivityReportPrint user={user} match={match} />);
  }
  afterEach(() => fetchMock.restore());

  beforeEach(() => {
    fetchMock.get('/api/user', user);
    fetchMock.get('/api/activity-reports/5000', report);
  });

  it('renders an activity report in clean view', () => {
    renderActivityReportPrint();
    expect(true).toBe(false);
  });
});
