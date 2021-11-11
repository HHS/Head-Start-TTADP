import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import fetchMock from 'fetch-mock';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import TTAHistory from '../TTAHistory';

const memoryHistory = createMemoryHistory();

describe('Grantee Record - TTA History', () => {
  const overviewResponse = {
    numReports: '1', numGrants: '1', inPerson: '0', sumDuration: '1.0', numParticipants: '1',
  };

  const tableResponse = {
    count: 0,
    rows: [],
  };

  const renderTTAHistory = () => {
    render(
      <Router history={memoryHistory}>
        <TTAHistory granteeName="Jim Grantee" granteeId="401" regionId="1" />
      </Router>,
    );
  };

  beforeEach(async () => {
    const overviewUrl = '/api/widgets/overview?region.in[]=400&granteeId.in[]=100&modelType.is=grant';
    const tableUrl = '/api/activity-reports?sortBy=updatedAt&sortDir=desc&offset=0&limit=10&region.in[]=400&region.in[]=401&granteeId.in[]=100&modelType.is=grant';
    fetchMock.get(overviewUrl, overviewResponse);
    fetchMock.get(tableUrl, tableResponse);
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
    const reports = await screen.findByText('Activity Reports');
    expect(reports).toBeInTheDocument();
  });
});
