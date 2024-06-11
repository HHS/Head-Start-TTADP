import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen, act,
} from '@testing-library/react';
import fetchMock from 'fetch-mock';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import selectEvent from 'react-select-event';
import { SCOPE_IDS } from '@ttahub/common';
import TTAHistory from '../TTAHistory';
import { formatDateRange } from '../../../../utils';
import UserContext from '../../../../UserContext';

const yearToDate = encodeURIComponent(formatDateRange({ yearToDate: true, forDateTime: true }));

describe('Recipient Record - TTA History', () => {
  const overviewResponse = {
    numReports: '1', numGrants: '1', inPerson: '0', sumDuration: '1.0', numParticipants: '1',
  };

  const tableResponse = {
    count: 0,
    rows: [],
  };

  const user = {
    homeRegionId: 14,
    permissions: [{
      regionId: 1,
      scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
    }, {
      regionId: 2,
      scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
    }],
  };

  const renderTTAHistory = ({ name = 'Jim Recipient' } = {}) => {
    render(
      <UserContext.Provider value={{ user }}>
        <MemoryRouter>
          <TTAHistory recipientName={name} recipientId="401" regionId="1" />
        </MemoryRouter>

      </UserContext.Provider>,
    );
  };

  beforeEach(async () => {
    const overviewUrl = `/api/widgets/overview?startDate.win=${yearToDate}&region.in[]=1&recipientId.ctn[]=401`;
    const tableUrl = `/api/activity-reports?sortBy=updatedAt&sortDir=desc&offset=0&limit=10&startDate.win=${yearToDate}&region.in[]=1&recipientId.ctn[]=401`;

    fetchMock.get(overviewUrl, overviewResponse);
    fetchMock.get(tableUrl, tableResponse);

    fetchMock.get(`/api/widgets/targetPopulationTable?startDate.win=${yearToDate}&region.in[]=1&recipientId.ctn[]=401`, 200);
    fetchMock.get(`/api/widgets/frequencyGraph?startDate.win=${yearToDate}&region.in[]=1&recipientId.ctn[]=401`, 200);
  });

  afterEach(() => {
    fetchMock.restore();
  });

  it('renders the TTA History page appropriately', async () => {
    act(() => renderTTAHistory());
    const overview = document.querySelector('.smart-hub--dashboard-overview');
    expect(overview).toBeTruthy();
  });

  it('renders the activity reports table', async () => {
    renderTTAHistory();
    const reports = await screen.findByText(/approved activity reports/i, { selector: 'h2' });
    expect(reports).toBeInTheDocument();
  });

  it('renders null when recipientName is missing', async () => {
    renderTTAHistory({ name: null });
    const reports = screen.queryByText('Activity Reports');
    expect(reports).toBeNull();
  });

  it('combines filters appropriately', async () => {
    renderTTAHistory();
    fetchMock.get('/api/activity-reports?sortBy=updatedAt&sortDir=desc&offset=0&limit=10&role.in[]=Family%20Engagement%20Specialist&role.in[]=Grantee%20Specialist&region.in[]=1&recipientId.ctn[]=401', tableResponse);
    fetchMock.get('/api/widgets/targetPopulationTable?role.in[]=Family%20Engagement%20Specialist&role.in[]=Grantee%20Specialist&region.in[]=1&recipientId.ctn[]=401', 200);
    fetchMock.get('/api/widgets/frequencyGraph?role.in[]=Family%20Engagement%20Specialist&role.in[]=Grantee%20Specialist&region.in[]=1&recipientId.ctn[]=401', 200);
    fetchMock.get('/api/widgets/overview?role.in[]=Family%20Engagement%20Specialist&role.in[]=Grantee%20Specialist&region.in[]=1&recipientId.ctn[]=401', overviewResponse);

    await act(async () => {
      userEvent.click(await screen.findByRole('button', { name: /open filters for this page/i }));
      userEvent.selectOptions(await screen.findByRole('combobox', { name: 'topic' }), 'role');
      userEvent.selectOptions(await screen.findByRole('combobox', { name: 'condition' }), 'is');
      const specialistSelect = await screen.findByLabelText('Select specialist role to filter by');
      await selectEvent.select(specialistSelect, ['Family Engagement Specialist (FES)', 'Grantee Specialist (GS)']);
      const apply = await screen.findByRole('button', { name: /apply filters to recipient record data/i });
      userEvent.click(apply);
    });

    const button = await screen.findByRole('button', {
      name: /this button removes the filter: specialist roles is family engagement specialist, grantee specialist/i,
    });

    expect(button).toBeVisible();
  });
});
