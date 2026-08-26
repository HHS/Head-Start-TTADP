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

const SESSION_KEY = 'ttahistory-filters-v2-401';

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

    fetchMock.get(
      '/api/feeds/item?tag=ttahub-tta-history-filters',
      '<feed><entry><summary>Filter guidance</summary></entry></feed>',
      { overwriteRoutes: false }
    );
  });

  afterEach(() => {
    fetchMock.restore();
    window.sessionStorage.removeItem(SESSION_KEY);
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
      '/api/activity-reports?sortBy=updatedAt&sortDir=desc&offset=0&limit=10&myReports.in[]=AR%20creator&region.in[]=1&recipientId.ctn[]=401',
      tableResponse
    );
    fetchMock.get(
      '/api/widgets/targetPopulationTable?myReports.in[]=AR%20creator&region.in[]=1&recipientId.ctn[]=401',
      200
    );
    fetchMock.get(
      '/api/widgets/frequencyGraph?myReports.in[]=AR%20creator&region.in[]=1&recipientId.ctn[]=401',
      200
    );
    fetchMock.get(
      '/api/widgets/ttaHistoryOverview?myReports.in[]=AR%20creator&region.in[]=1&recipientId.ctn[]=401',
      overviewResponse
    );
    fetchMock.get(
      '/api/widgets/approvedARAndTRByGoalCategory?myReports.in[]=AR%20creator&region.in[]=1&recipientId.ctn[]=401',
      []
    );

    await act(async () => {
      userEvent.click(await screen.findByRole('button', { name: /open filters for this page/i }));
      userEvent.selectOptions(await screen.findByRole('combobox', { name: 'topic' }), 'myReports');
      userEvent.selectOptions(
        await screen.findByRole('combobox', { name: 'condition' }),
        "where I'm the"
      );
      const reportRolesSelect = await screen.findByLabelText('Select report roles to filter by');
      await selectEvent.select(reportRolesSelect, ['AR creator']);
      const apply = await screen.findByRole('button', {
        name: /apply filters to recipient record data/i,
      });
      userEvent.click(apply);
    });

    const button = await screen.findByRole('button', {
      name: /this button removes the filter: my reports where i'm the ar creator/i,
    });

    expect(button).toBeVisible();
  });

  it('strips stale role and activityReportGoalResponse filters from session storage before fetching', async () => {
    const defaultDateDecoded = formatDateRange({ yearToDate: true, forDateTime: true });
    window.sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify([
        { id: 'stale-1', topic: 'role', condition: 'is', query: ['Grantee Specialist'] },
        {
          id: 'stale-2',
          topic: 'activityReportGoalResponse',
          condition: 'is',
          query: ['Agree'],
        },
        { id: 'valid-1', topic: 'startDate', condition: 'is within', query: defaultDateDecoded },
      ])
    );

    act(() => renderTTAHistory());

    expect(fetchMock.called(/role\.in\[\]/)).toBe(false);
    expect(fetchMock.called(/activityReportGoalResponse\.in\[\]/)).toBe(false);
  });

  it('strips stale role filter from URL params before fetching', async () => {
    const staleHistory = createMemoryHistory();
    staleHistory.push({ search: '?role.in[]=Grantee%20Specialist' });

    // The beforeEach mocks only the clean startDate URL; if a role.in[] request
    // were sent, fetchMock would throw on the unregistered URL.
    act(() => {
      render(
        <UserContext.Provider value={{ user }}>
          <Router history={staleHistory}>
            <TTAHistory recipientName="Jim Recipient" recipientId="401" regionId="1" />
          </Router>
        </UserContext.Provider>
      );
    });

    expect(fetchMock.called(/role\.in\[\]/)).toBe(false);
  });
});
