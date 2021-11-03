import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import fetchMock from 'fetch-mock';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import GranteeRecord from '../index';

const memoryHistory = createMemoryHistory();

describe('grantee record page', () => {
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

  const theMightyGrantee = {
    name: 'the Mighty Grantee',
    grants: [
      {
        name: 'Grant Name 1',
        number: 'GRANTEE_NUMBER',
        status: 'Active',
        programTypes: ['Early Head Start (ages 0-3)', 'Head Start (ages 3-5)'],
        startDate: null,
        endDate: null,
        id: 10,
        regionId: 45,
        programSpecialistName: 'The Mighty Program Specialist',
        granteeId: 9,
      },
    ],
  };

  function renderGranteeRecord(history = memoryHistory) {
    const match = {
      path: '',
      url: '',
      params: {
        granteeId: '1',
      },
    };

    const location = {
      search: '?region=45',
      hash: '',
      pathname: '',
    };

    render(
      <Router history={history}>
        <GranteeRecord user={user} match={match} location={location} />
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
    fetchMock.get('/api/widgets/overview?region.in[]=45&granteeId.in[]=1', overview);
  });
  afterEach(() => {
    fetchMock.restore();
  });

  it('shows the grantee name', async () => {
    fetchMock.get('/api/grantee/1?region.in[]=45', theMightyGrantee);
    act(() => renderGranteeRecord());

    const granteeName = await screen.findByText('the Mighty Grantee - Region 45');
    expect(granteeName).toBeInTheDocument();
  });

  it('renders the navigation', async () => {
    fetchMock.get('/api/grantee/1?region.in[]=45', theMightyGrantee);
    act(() => renderGranteeRecord());

    const backToSearch = await screen.findByRole('link', { name: /back to search/i });
    const ttaHistory = await screen.findByRole('link', { name: /tta history/i });
    expect(backToSearch).toBeVisible();
    expect(ttaHistory).toBeVisible();
  });

  it('handles grantee not found', async () => {
    fetchMock.get('/api/grantee/1?region.in[]=45', 404);
    act(() => renderGranteeRecord());
    const error = await screen.findByText('Grantee record not found');
    expect(error).toBeInTheDocument();
  });

  it('handles fetch error', async () => {
    fetchMock.get('/api/grantee/1?region.in[]=45', 500);
    act(() => renderGranteeRecord());
    const error = await screen.findByText('There was an error fetching grantee data');
    expect(error).toBeInTheDocument();
  });

  it('navigates to the profile page', async () => {
    fetchMock.get('/api/grantee/1?region.in[]=45', theMightyGrantee);
    memoryHistory.push('/grantee/1/profile?region.=45');
    act(() => renderGranteeRecord(memoryHistory));
    const heading = await screen.findByRole('heading', { name: /grantee summary/i });
    expect(heading).toBeInTheDocument();
  });

  it('navigates to the tta history page', async () => {
    fetchMock.get('/api/grantee/1?region.in[]=45', theMightyGrantee);
    memoryHistory.push('/grantee/1/tta-history?region=45');
    act(() => renderGranteeRecord(memoryHistory));
    await waitFor(() => {
      const ar = screen.getByText(/the total number of approved activity reports\. click to visually reveal this information/i);
      expect(ar).toBeInTheDocument();
    });
  });
});
