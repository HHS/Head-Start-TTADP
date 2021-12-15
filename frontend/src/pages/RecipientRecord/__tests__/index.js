import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react-dom/test-utils';
import fetchMock from 'fetch-mock';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import RecipientRecord from '../index';
import { formatDateRange } from '../../../components/DateRangeSelect';

const yearToDate = formatDateRange({ yearToDate: true, forDateTime: true });

const memoryHistory = createMemoryHistory();

describe('recipient record page', () => {
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

  const theMightyRecipient = {
    name: 'the Mighty Recipient',
    grants: [
      {
        name: 'Grant Name 1',
        number: 'GRANTEE_NUMBER',
        status: 'Active',
        startDate: null,
        endDate: null,
        id: 10,
        regionId: 45,
        programSpecialistName: 'The Mighty Program Specialist',
        recipientId: 9,
      },
    ],
  };

  function renderRecipientRecord(history = memoryHistory) {
    const match = {
      path: '',
      url: '',
      params: {
        recipientId: '1',
      },
    };

    const location = {
      search: '?region=45',
      hash: '',
      pathname: '',
    };

    render(
      <Router history={history}>
        <RecipientRecord user={user} match={match} location={location} />
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
    fetchMock.get('/api/user', user);
    fetchMock.get('/api/widgets/overview', overview);
    fetchMock.get('/api/widgets/overview?region.in[]=45&recipientId.in[]=1', overview);
    fetchMock.get(`/api/widgets/overview?startDate.win=${yearToDate}&region.in[]=45&recipientId.in[]=1`, overview);
    fetchMock.get('/api/activity-reports?sortBy=updatedAt&sortDir=desc&offset=0&limit=10', { count: 0, rows: [] });
    fetchMock.get(`/api/activity-reports?sortBy=updatedAt&sortDir=desc&offset=0&limit=10&startDate.win=${yearToDate}&region.in[]=45&recipientId.in[]=1`, { count: 0, rows: [] });
    fetchMock.get('/api/activity-reports?sortBy=updatedAt&sortDir=desc&offset=0&limit=10&region.in[]=45&recipientId.in[]=1', { count: 0, rows: [] });
    fetchMock.get(`/api/activity-reports?sortBy=updatedAt&sortDir=desc&offset=0&limit=10&startDate.win=${yearToDate}`, { count: 0, rows: [] });
    fetchMock.get('/api/widgets/frequencyGraph', 200);
    fetchMock.get(`/api/widgets/frequencyGraph?startDate.win=${yearToDate}&region.in[]=45&recipientId.in[]=1`, 200);
    fetchMock.get('/api/widgets/frequencyGraph?region.in[]=45&recipientId.in[]=1', 200);
    fetchMock.get(`/api/widgets/frequencyGraph?startDate.win=${yearToDate}`, 200);
    fetchMock.get('/api/widgets/targetPopulationTable?region.in[]=45&recipientId.in[]=1', 200);
    fetchMock.get(`/api/widgets/targetPopulationTable?startDate.win=${yearToDate}&region.in[]=45&recipientId.in[]=1`, 200);
  });
  afterEach(() => {
    fetchMock.restore();
  });

  it('shows the recipient name', async () => {
    fetchMock.get('/api/recipient/1?region.in[]=45', theMightyRecipient);
    act(() => renderRecipientRecord());

    const recipientName = await screen.findByText('the Mighty Recipient - Region 45');
    expect(recipientName).toBeInTheDocument();
  });

  it('renders the navigation', async () => {
    fetchMock.get('/api/recipient/1?region.in[]=45', theMightyRecipient);
    act(() => renderRecipientRecord());

    const backToSearch = await screen.findByRole('link', { name: /back to search/i });
    const ttaHistory = await screen.findByRole('link', { name: /tta history/i });
    expect(backToSearch).toBeVisible();
    expect(ttaHistory).toBeVisible();
  });

  it('handles recipient not found', async () => {
    fetchMock.get('/api/recipient/1?region.in[]=45', 404);
    act(() => renderRecipientRecord());
    const error = await screen.findByText('Recipient record not found');
    expect(error).toBeInTheDocument();
  });

  it('handles fetch error', async () => {
    fetchMock.get('/api/recipient/1?region.in[]=45', 500);
    act(() => renderRecipientRecord());
    const error = await screen.findByText('There was an error fetching recipient data');
    expect(error).toBeInTheDocument();
  });

  it('navigates to the profile page', async () => {
    fetchMock.get('/api/recipient/1?region.in[]=45', theMightyRecipient);
    memoryHistory.push('/recipient-tta-records/1/profile?region.=45');
    act(() => renderRecipientRecord(memoryHistory));
    const heading = await screen.findByRole('heading', { name: /recipient summary/i });
    expect(heading).toBeInTheDocument();
  });

  it('navigates to the tta history page', async () => {
    fetchMock.get('/api/recipient/1?region.in[]=45', theMightyRecipient);
    memoryHistory.push('/recipient-tta-records/1/tta-history?region=45');
    act(() => renderRecipientRecord(memoryHistory));
    await waitFor(() => {
      const ar = screen.getByText(/the total number of approved activity reports\. click to visually reveal this information/i);
      expect(ar).toBeInTheDocument();
    });

    const remove = screen.getByRole('button', {
      name: /this button removes the filter: date range is within 01\/01\/2021/i,
    });

    act(() => userEvent.click(remove));
    expect(remove).not.toBeInTheDocument();
  });
});
