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

  const filtersToApply = [
    {
      id: '1',
      topic: 'region',
      condition: 'Contains',
      query: ['400', '401'],
    },
    {
      id: '2',
      topic: 'granteeId',
      condition: 'Contains',
      query: '100',
    },
    {
      id: '3',
      topic: 'modelType',
      condition: 'Is',
      query: 'grant',
    },
  ];

  const renderTTAHistory = (filters = filtersToApply) => {
    render(
      <Router history={memoryHistory}>
        <TTAHistory filters={filters} regionId={1} />
      </Router>,
    );
  };

  beforeEach(async () => {
    const overviewUrl = '/api/widgets/overview?region.in[]=400&granteeId.in[]=100&modelType.is=grant';
    const tableUrl = '/api/activity-reports?sortBy=updatedAt&sortDir=desc&offset=0&limit=10&region.in[]=400&granteeId.in[]=100&modelType.is=grant';
    fetchMock.get(overviewUrl, overviewResponse);
    fetchMock.get(tableUrl, tableResponse);
  });

  afterEach(() => {
    fetchMock.restore();
  });

  it('renders the TTA History page appropriately', async () => {
    act(() => renderTTAHistory());
    const onePointOh = await screen.findByText('1.0');
    expect(onePointOh).toBeInTheDocument();
  });

  it('renders the activity reports table', async () => {
    renderTTAHistory();
    const reports = await screen.findByText('Activity Reports');
    expect(reports).toBeInTheDocument();
  });
});
