import '@testing-library/jest-dom';
import React from 'react';
import { SCOPE_IDS } from '@ttahub/common';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';
import fetchMock from 'fetch-mock';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import RecipientRecord, { PageWithHeading } from '../index';
import { formatDateRange } from '../../../utils';
import UserContext from '../../../UserContext';
import AppLoadingContext from '../../../AppLoadingContext';
import { GrantDataProvider } from '../pages/GrantDataContext';

const { ADMIN } = SCOPE_IDS;
const yearToDate = encodeURIComponent(formatDateRange({ yearToDate: true, forDateTime: true }));

describe('recipient record page', () => {
  const memoryHistory = createMemoryHistory();
  const user = {
    id: 2,
    permissions: [
      {
        scopeId: ADMIN,
      },
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

  const theMightyRecipient = {
    id: 1,
    name: 'the Mighty Recipient',
    grants: [
      {
        name: 'Grant Name 1',
        number: 'RECIPIENT_NUMBER',
        status: 'Active',
        startDate: null,
        endDate: null,
        id: 10,
        regionId: 45,
        programSpecialistName: 'The Mighty Program Specialist',
        recipientId: 9,
        numberWithProgramTypes: 'RECIPIENT_NUMBER EHS',
      },
    ],
  };

  function renderRecipientRecord() {
    const match = {
      path: '',
      url: '',
      params: {
        recipientId: '1',
        regionId: '45',
      },
    };

    render(
      <Router history={memoryHistory}>
        <UserContext.Provider value={{ user }}>
          <GrantDataProvider>
            <AppLoadingContext.Provider value={
            {
              setIsAppLoading: jest.fn(),
              setAppLoadingText: jest.fn(),
              isAppLoading: false,
            }
          }
            >
              <RecipientRecord match={match} hasAlerts={false} />
            </AppLoadingContext.Provider>
          </GrantDataProvider>
        </UserContext.Provider>
      </Router>,
    );
  }

  const overview = {
    duration: '',
    deliveryMethod: '',
    numberOfParticipants: '',
    inPerson: '',
    sumDuration: '',
    numParticipants: '',
    numReports: '',
    numGrants: '',
  };

  beforeEach(() => {
    jest.restoreAllMocks();
    fetchMock.get('/api/user', user);
    fetchMock.get('/api/widgets/overview', overview);
    fetchMock.get('/api/widgets/overview?region.in[]=45&recipientId.ctn[]=1', overview);
    fetchMock.get(`/api/widgets/overview?startDate.win=${yearToDate}&region.in[]=45&recipientId.ctn[]=1`, overview);
    fetchMock.get('/api/activity-reports?sortBy=updatedAt&sortDir=desc&offset=0&limit=10', { count: 0, rows: [] });
    fetchMock.get(`/api/activity-reports?sortBy=updatedAt&sortDir=desc&offset=0&limit=10&startDate.win=${yearToDate}&region.in[]=45&recipientId.ctn[]=1`, { count: 0, rows: [] });
    fetchMock.get('/api/activity-reports?sortBy=updatedAt&sortDir=desc&offset=0&limit=10&region.in[]=45&recipientId.ctn[]=1', { count: 0, rows: [], topics: [] });
    fetchMock.get(`/api/activity-reports?sortBy=updatedAt&sortDir=desc&offset=0&limit=10&startDate.win=${yearToDate}`, { count: 0, rows: [], topics: [] });
    fetchMock.get('/api/widgets/frequencyGraph', 200);
    fetchMock.get(`/api/widgets/frequencyGraph?startDate.win=${yearToDate}&region.in[]=45&recipientId.ctn[]=1`, 200);
    fetchMock.get('/api/widgets/frequencyGraph?region.in[]=45&recipientId.ctn[]=1', 200);
    fetchMock.get(`/api/widgets/frequencyGraph?startDate.win=${yearToDate}`, 200);
    fetchMock.get('/api/widgets/targetPopulationTable?region.in[]=45&recipientId.ctn[]=1', 200);
    fetchMock.get(`/api/widgets/targetPopulationTable?startDate.win=${yearToDate}&region.in[]=45&recipientId.ctn[]=1`, 200);
    fetchMock.get('/api/widgets/goalStatusGraph?region.in[]=45&recipientId.ctn[]=1', 200);
    fetchMock.get('/api/recipient/1/region/45/goals?sortBy=goalStatus&sortDir=asc&offset=0&limit=5', []);
    fetchMock.get('/api/recipient/1/region/45/goals?sortBy=goalStatus&sortDir=asc&offset=0&limit=10', []);
    fetchMock.get('/api/monitoring/class/1/region/45/grant/RECIPIENT_NUMBER', {});
    fetchMock.get('/api/monitoring/1/region/45/grant/RECIPIENT_NUMBER', {});
    fetchMock.get('/api/monitoring/undefined/region/45/grant/RECIPIENT_NUMBER', {});
    fetchMock.get('/api/monitoring/class/undefined/region/45/grant/RECIPIENT_NUMBER', {});
  });
  afterEach(() => {
    fetchMock.restore();
    jest.restoreAllMocks();
  });

  it('shows the recipient name', async () => {
    fetchMock.get('/api/recipient/1?region.in[]=45', theMightyRecipient);
    fetchMock.get('/api/recipient/undefined/region/45/leadership', []);
    act(() => renderRecipientRecord());

    const recipientName = await screen.findByRole('heading', { level: 1 });
    expect(recipientName.textContent).toEqual('the Mighty Recipient - Region 45');
  });

  it('handles a 404', async () => {
    fetchMock.get('/api/recipient/1?region.in[]=45', 404);
    fetchMock.get('/api/recipient/undefined/region/45/leadership', []);
    act(() => renderRecipientRecord());

    const recipientName = await screen.findByRole('heading', { level: 1 });
    expect(recipientName.textContent).toEqual(' - Region 45');
  });

  it('renders correctly when recipient data fetch succeeds', async () => {
    fetchMock.get('/api/recipient/1?region.in[]=45', theMightyRecipient);
    fetchMock.get('/api/recipient/undefined/region/45/leadership', []);
    act(() => renderRecipientRecord());

    const recipientName = await screen.findByRole('heading', { level: 1 });
    expect(recipientName.textContent).toEqual('the Mighty Recipient - Region 45');
  });

  it('renders the navigation', async () => {
    fetchMock.get('/api/recipient/1?region.in[]=45', theMightyRecipient);
    fetchMock.get('/api/recipient/undefined/region/45/leadership', []);
    act(() => renderRecipientRecord());

    const backToSearch = await screen.findByRole('link', { name: /back to search/i });
    const ttaHistory = await screen.findByRole('link', { name: /tta history/i });
    expect(backToSearch).toBeVisible();
    expect(ttaHistory).toBeVisible();
  });

  it('handles recipient not found', async () => {
    fetchMock.get('/api/recipient/1?region.in[]=45', 404);
    const spy = jest.spyOn(memoryHistory, 'push');
    await act(async () => renderRecipientRecord());
    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith('/something-went-wrong/404');
    });
  });

  it('handles fetch error', async () => {
    fetchMock.get('/api/recipient/1?region.in[]=45', 500);
    const spy = jest.spyOn(memoryHistory, 'push');
    act(() => renderRecipientRecord());
    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith('/something-went-wrong/500');
    });
  });

  it('navigates to the profile page', async () => {
    fetchMock.get('/api/recipient/1?region.in[]=45', theMightyRecipient);
    fetchMock.get('/api/recipient/1/region/45/leadership', []);
    memoryHistory.push('/recipient-tta-records/1/region/45/profile');
    act(() => renderRecipientRecord());
    const heading = await screen.findByRole('heading', { name: /recipient summary/i });
    expect(heading).toBeInTheDocument();
  });

  it('navigates to the tta history page', async () => {
    fetchMock.get('/api/recipient/1?region.in[]=45', theMightyRecipient);
    memoryHistory.push('/recipient-tta-records/1/region/45/tta-history');
    act(() => renderRecipientRecord());
    const ar = await screen.findAllByText(/the number of approved activity reports\./i);
    expect(ar[0]).toBeInTheDocument();

    const remove = screen.getByRole('button', {
      name: /this button removes the filter: date started \(ar\) is within/i,
    });

    userEvent.click(remove);
    await waitFor(() => expect(remove).not.toBeInTheDocument());
  });

  it('navigates to the goals & objectives page', async () => {
    fetchMock.get('/api/recipient/1?region.in[]=45', theMightyRecipient);
    memoryHistory.push('/recipient-tta-records/1/region/45/rttapa');
    act(() => renderRecipientRecord());
    await waitFor(() => expect(screen.queryByText(/loading.../)).toBeNull());
    expect(document.querySelector('#recipientGoalsObjectives')).toBeTruthy();
  });

  it('navigates to the print goals page', async () => {
    fetchMock.get('/api/recipient/1?region.in[]=45', theMightyRecipient);
    fetchMock.get('/api/recipient/1/region/45/goals?sortBy=goalStatus&sortDir=asc&offset=0&limit=false', { goalRows: [] });
    memoryHistory.push('/recipient-tta-records/45/region/1/rttapa/print');
    act(() => renderRecipientRecord());
    await waitFor(() => expect(screen.queryByText(/loading.../)).toBeNull());
    await screen.findByText(/TTA Goals for the Mighty Recipient/i);
  });

  it('navigates to the communication log page', async () => {
    fetchMock.get('/api/recipient/1?region.in[]=45', theMightyRecipient);
    fetchMock.get('/api/communication-logs/region/1/log/1', 404);
    memoryHistory.push('/recipient-tta-records/45/region/1/communication/1/view');
    const spy = jest.spyOn(memoryHistory, 'push');
    act(() => renderRecipientRecord());
    await waitFor(() => expect(screen.queryByText(/loading.../)).toBeNull());
    await waitFor(() => expect(spy).toHaveBeenCalledWith('/something-went-wrong/404'));
  });

  it('navigates to the communication log form', async () => {
    fetchMock.get('/api/recipient/1?region.in[]=45', theMightyRecipient);
    memoryHistory.push('/recipient-tta-records/45/region/1/communication/new/log');
    act(() => renderRecipientRecord());
    await waitFor(() => expect(screen.queryByText(/loading.../)).toBeNull());
    await screen.findByText(/Back to Communication Log/i);
  });

  it('navigates to the communication logs', async () => {
    fetchMock.get('/api/recipient/1?region.in[]=45', theMightyRecipient);
    fetchMock.get('/api/communication-logs/region/45/recipient/1?sortBy=communicationDate&direction=desc&offset=0&limit=10&format=json&', []);
    memoryHistory.push('/recipient-tta-records/45/region/1/communication');
    act(() => renderRecipientRecord());
    await waitFor(() => expect(screen.queryByText(/loading.../)).toBeNull());
    await screen.findByText(/You haven't logged any communication yet./i);
  });

  it('renders communication log header with correct structure', async () => {
    fetchMock.get('/api/recipient/1?region.in[]=45', theMightyRecipient);
    fetchMock.get('/api/communication-logs/region/45/recipient/1?sortBy=communicationDate&direction=desc&offset=0&limit=10&format=json&', []);
    memoryHistory.push('/recipient-tta-records/45/region/1/communication');
    act(() => renderRecipientRecord());

    await waitFor(() => expect(screen.queryByText(/loading.../)).toBeNull());

    const header = screen.getByRole('heading', { level: 1 });
    expect(header).toHaveClass('page-heading');
    expect(header.textContent).toBe('the Mighty Recipient - Region 45');

    const addButton = screen.getByRole('link', { name: /add communication/i });
    expect(addButton).toHaveClass('usa-button', 'smart-hub--new-report-btn');
    expect(addButton.getAttribute('href')).toBe('/recipient-tta-records/1/region/45/communication/new');
  });

  it('navigates to the goal name form', async () => {
    fetchMock.get('/api/recipient/1?region.in[]=45', theMightyRecipient);
    fetchMock.get('/api/goal-templates?grantIds=10', []);
    memoryHistory.push('/recipient-tta-records/1/region/45/goals/new');
    act(() => renderRecipientRecord());
    await waitFor(() => expect(screen.queryByText(/loading.../)).toBeNull());
    expect(await screen.findByText(/Recipient TTA goal/i)).toBeInTheDocument();
  });

  it('navigates to the restart standard goal', async () => {
    fetchMock.get('/api/recipient/1?region.in[]=45', theMightyRecipient);
    fetchMock.get('/api/goal-templates?grantIds=10', []);
    fetchMock.get('/api/goal-templates/standard/10/grant/10?status=Closed', {
      goalTemplateId: 10,
      grantId: 10,
      responses: [],
      id: 1234,
      objectives: [],
      name: 'a goal name',
      grant: {
        id: 1234,
        numberWithProgramTypes: '1234 EHS',
      },
    });
    fetchMock.get('/api/goal-templates/10/prompts', [[], []]);
    memoryHistory.push('/recipient-tta-records/1/region/45/standard-goals/10/grant/10/restart');
    act(() => renderRecipientRecord());
    await waitFor(() => expect(screen.queryByText(/loading.../)).toBeNull());
    expect(await screen.findByText(/Recipient TTA goal/i)).toBeInTheDocument();
  });

  it('navigates to the update standard goal', async () => {
    fetchMock.get('/api/recipient/1?region.in[]=45', theMightyRecipient);
    fetchMock.get('/api/goal-templates?grantIds=10', []);
    fetchMock.get('/api/goal-templates/standard/10/grant/10', {
      goalTemplateId: 10,
      grantId: 10,
      responses: [],
      id: 1234,
      objectives: [],
      name: 'a goal name',
      grant: {
        id: 1234,
        numberWithProgramTypes: '1234 EHS',
      },
    });
    fetchMock.get('/api/goal-templates/10/prompts', [[], []]);
    memoryHistory.push('/recipient-tta-records/1/region/45/standard-goals/10/grant/10');
    act(() => renderRecipientRecord());
    await waitFor(() => expect(screen.queryByText(/loading.../)).toBeNull());
    expect(await screen.findByText(/Goal G-1234/i)).toBeInTheDocument();
  });

  describe('PageWithHeading', () => {
    const recipientNameWithRegion = 'Recipient 1 - Region 1';

    const renderTest = (
      backLink,
      error = '',
    ) => {
      render(
        <Router history={memoryHistory}>
          <UserContext.Provider value={{ user }}>
            <PageWithHeading error={error} regionId="1" recipientId="1" recipientNameWithRegion={recipientNameWithRegion} slug="sadness" backLink={backLink}>
              <div>
                <h1>Test</h1>
              </div>
            </PageWithHeading>
          </UserContext.Provider>
        </Router>,
      );
    };

    it('the top is not padded when the backlink is present', async () => {
      renderTest(<a href="/recipient-tta-records/1/region/1/profile">Back to profile</a>);
      const heading = await screen.findByRole('heading', { name: recipientNameWithRegion });
      expect(heading).toHaveClass('margin-top-0');
    });

    it('the top is padded when the backlink is not present', async () => {
      renderTest(<></>);
      const heading = await screen.findByRole('heading', { name: recipientNameWithRegion });
      expect(heading).toHaveClass('margin-top-5');
    });

    it('handles an error', async () => {
      renderTest(<a href="/recipient-tta-records/1/region/1/profile">Back to profile</a>, 'error');
      const error = await screen.findByText('error');
      expect(error).toBeInTheDocument();
    });
  });
});
