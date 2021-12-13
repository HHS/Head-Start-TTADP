import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import fetchMock from 'fetch-mock';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import TTAHistory from '../TTAHistory';
import { formatDateRange } from '../../../../components/DateRangeSelect';

const memoryHistory = createMemoryHistory();
const yearToDate = formatDateRange({ yearToDate: true, forDateTime: true });

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
    const overviewUrl = `/api/widgets/overview?startDate.win=${yearToDate}&region.in[]=1&granteeId.in[]=401`;
    const tableUrl = `/api/activity-reports?sortBy=updatedAt&sortDir=desc&offset=0&limit=10&startDate.win=${yearToDate}&region.in[]=1&granteeId.in[]=401`;
    fetchMock.get(overviewUrl, overviewResponse);
    fetchMock.get(tableUrl, tableResponse);

    fetchMock.get(`/api/widgets/targetPopulationTable?startDate.win=${yearToDate}&region.in[]=1&granteeId.in[]=401`, 200);
    fetchMock.get(`/api/widgets/frequencyGraph?startDate.win=${yearToDate}&region.in[]=1&granteeId.in[]=401`, 200);
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
