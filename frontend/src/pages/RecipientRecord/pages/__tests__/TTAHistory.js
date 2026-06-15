import '@testing-library/jest-dom';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SCOPE_IDS } from '@ttahub/common';
import fetchMock from 'fetch-mock';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Router } from 'react-router';
import selectEvent from 'react-select-event';
import UserContext from '../../../../UserContext';
import { formatDateRange } from '../../../../utils';
import TTAHistory from '../TTAHistory';

const memoryHistory = createMemoryHistory();
const yearToDate = encodeURIComponent(formatDateRange({ yearToDate: true, forDateTime: true }));

describe('Recipient Record - TTA History', () => {
  const overviewResponse = {
    numReports: '1',
    numGrants: '1',
    inPerson: '0',
    sumDuration: '1.0',
    numParticipants: '1',
    numSessions: '3',
  };

  const tableResponse = {
    count: 0,
    rows: [],
  };

  const user = {
    homeRegionId: 14,
    permissions: [
      {
        regionId: 1,
        scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
      },
      {
        regionId: 2,
        scopeId: SCOPE_IDS.READ_ACTIVITY_REPORTS,
      },
    ],
  };

  const renderTTAHistory = ({ name = 'Jim Recipient' } = {}) => {
    render(
      <UserContext.Provider value={{ user }}>
        <Router history={memoryHistory}>
          <TTAHistory recipientName={name} recipientId="401" regionId="1" />
        </Router>
      </UserContext.Provider>
    );
  };

  beforeEach(async () => {
    const ttaHistoryOverviewUrl = `/api/widgets/ttaHistoryOverview?startDate.win=${yearToDate}&region.in[]=1&recipientId.ctn[]=401`;
    const tableUrl = `/api/activity-reports?sortBy=updatedAt&sortDir=desc&offset=0&limit=10&startDate.win=${yearToDate}&region.in[]=1&recipientId.ctn[]=401`;

    fetchMock.get(ttaHistoryOverviewUrl, overviewResponse);
    fetchMock.get(tableUrl, tableResponse);

    fetchMock.get(
      `/api/widgets/targetPopulationTable?startDate.win=${yearToDate}&region.in[]=1&recipientId.ctn[]=401`,
      200
    );
    fetchMock.get(
      `/api/widgets/frequencyGraph?startDate.win=${yearToDate}&region.in[]=1&recipientId.ctn[]=401`,
      200
    );
    fetchMock.get(
      `/api/widgets/approvedARAndTRByGoalCategory?startDate.win=${yearToDate}&region.in[]=1&recipientId.ctn[]=401`,
      []
    );
  });

  afterEach(() => {
    fetchMock.restore();
  });

  it('renders the TTA History page appropriately', async () => {
    act(() => renderTTAHistory());
    const overview = document.querySelector('.smart-hub--dashboard-overview-container');
    expect(overview).toBeTruthy();
  });

  it('renders the TR sessions widget', async () => {
    act(() => renderTTAHistory());
    const trSessionsLabel = await screen.findByText('Training report sessions');
    expect(trSessionsLabel).toBeTruthy();
  });

  it('renders the activity reports table', async () => {
    renderTTAHistory();
    // Use exact match: the tableCaption is "Approved activity reports" (lowercase 'a');
    // the ApprovedARAndTRByGoalCategory widget title starts with capital 'A' and is longer,
    // so a case-sensitive exact query selects only the table header.
    const reports = await screen.findByText('Approved activity reports', { selector: 'h2' });
    expect(reports).toBeInTheDocument();
  });

  it('renders null when recipientName is missing', async () => {
    renderTTAHistory({ name: null });
    const reports = screen.queryByText('Activity Reports');
    expect(reports).toBeNull();
  });

  it('fetches approvedARAndTRByGoalCategory with the same page filters as other widgets', async () => {
    act(() => renderTTAHistory());
    // withWidgetData fires on mount; the beforeEach mock registers the URL including
    // startDate, region, and recipientId — confirm it was called.
    const url = `/api/widgets/approvedARAndTRByGoalCategory?startDate.win=${yearToDate}&region.in[]=1&recipientId.ctn[]=401`;
    expect(fetchMock.called(url)).toBe(true);
  });

  it('combines filters appropriately', async () => {
    renderTTAHistory();
    fetchMock.get(
      '/api/activity-reports?sortBy=updatedAt&sortDir=desc&offset=0&limit=10&role.in[]=Family%20Engagement%20Specialist&role.in[]=Grantee%20Specialist&region.in[]=1&recipientId.ctn[]=401',
      tableResponse
    );
    fetchMock.get(
      '/api/widgets/targetPopulationTable?role.in[]=Family%20Engagement%20Specialist&role.in[]=Grantee%20Specialist&region.in[]=1&recipientId.ctn[]=401',
      200
    );
    fetchMock.get(
      '/api/widgets/frequencyGraph?role.in[]=Family%20Engagement%20Specialist&role.in[]=Grantee%20Specialist&region.in[]=1&recipientId.ctn[]=401',
      200
    );
    fetchMock.get(
      '/api/widgets/ttaHistoryOverview?role.in[]=Family%20Engagement%20Specialist&role.in[]=Grantee%20Specialist&region.in[]=1&recipientId.ctn[]=401',
      overviewResponse
    );
    fetchMock.get(
      '/api/widgets/approvedARAndTRByGoalCategory?role.in[]=Family%20Engagement%20Specialist&role.in[]=Grantee%20Specialist&region.in[]=1&recipientId.ctn[]=401',
      []
    );

    await act(async () => {
      userEvent.click(await screen.findByRole('button', { name: /open filters for this page/i }));
      userEvent.selectOptions(await screen.findByRole('combobox', { name: 'topic' }), 'role');
      userEvent.selectOptions(await screen.findByRole('combobox', { name: 'condition' }), 'is');
      const specialistSelect = await screen.findByLabelText('Select specialist role to filter by');
      await selectEvent.select(specialistSelect, [
        'Family Engagement Specialist (FES)',
        'Grantee Specialist (GS)',
      ]);
      const apply = await screen.findByRole('button', {
        name: /apply filters to recipient record data/i,
      });
      userEvent.click(apply);
    });

    const button = await screen.findByRole('button', {
      name: /this button removes the filter: specialist roles is family engagement specialist, grantee specialist/i,
    });

    expect(button).toBeVisible();
  });
});
