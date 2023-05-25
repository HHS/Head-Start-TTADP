import React from 'react';
import {
  render, screen, act,
} from '@testing-library/react';
import fetchMock from 'fetch-mock';
import { SCOPE_IDS } from '@ttahub/common';
import RegionalGoalDashboard from '../index';
import UserContext from '../../../UserContext';

describe('TrainingReports', () => {
  const nonCentralOfficeUser = {
    homeRegionId: 1,
    permissions: [{
      regionId: 2,
      scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
    }],
  };

  const renderTrainingReports = (u) => {
    const user = u || nonCentralOfficeUser;
    render(
      <UserContext.Provider value={{ user }}>
        <RegionalGoalDashboard />
      </UserContext.Provider>,
    );
  };

  beforeEach(async () => {
  });

  afterEach(async () => {
    fetchMock.restore();
  });

  it('renders the training reports page', async () => {
    act(() => {
      renderTrainingReports();
    });
    expect(await screen.findByRole('heading', { name: /Training reports/i })).toBeInTheDocument();
  });

  it('renders the header with one region', async () => {
    act(() => {
      renderTrainingReports();
    });
    expect(await screen.findByRole('heading', { name: /training reports - region 1/i })).toBeInTheDocument();
  });

  it('renders the header with all regions', async () => {
    const centralOfficeUser = {
      homeRegionId: 14,
      permissions: [{
        regionId: 2,
        scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
      }],
    };
    act(() => {
      renderTrainingReports(centralOfficeUser);
    });
    expect(await screen.findByRole('heading', { name: /training reports - all regions/i })).toBeInTheDocument();
  });
});
