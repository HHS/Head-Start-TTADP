import React from 'react';
import {
  render, screen, act, waitFor,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import fetchMock from 'fetch-mock';
import join from 'url-join';
// import userEvent from '@testing-library/user-event';
import RTTAPA from '../RTTAPA';
import UserContext from '../../../../UserContext';
import { SCOPE_IDS } from '../../../../Constants';

// const rttapaUrl = join('/', 'api', 'rttapa');
const recipientGoalsUrl = join(
  'api',
  'recipient',
  '1',
  'region',
  '1',
  'goals',
  '?sortBy=goalName&sortDir=desc&offset=0&limit=false',
  '&goalIds=1&goalIds=2',
);

describe('RTTAPA', () => {
  const user = {
    name: 'test@test.com',
    homeRegionId: 1,
    permissions: [
      {
        scopeId: SCOPE_IDS.READ_WRITE_ACTIVITY_REPORTS,
        regionId: 1,
      },
    ],
  };

  const goalsResponse = {
    goalRows: [
      {
        id: 1,
        ids: [1],
        goalText: 'Goal 1',
        goalStatus: 'In Progress',
        createdOn: '2022-01-01',
        goalTopics: ['goo'],
        reasons: ['diffidence'],
        previousStatus: null,
        isRttapa: true,
        objectives: [{
          id: 1,
          title: 'Objective 1',
          activityReports: [],
          ttaProvdided: '',
          endDate: '2022-01-01',
          reasons: ['diffidence'],
          status: 'In Progress',
        }],
      },
      {
        id: 2,
        ids: [2],
        goalText: 'Goal 2',
        goalStatus: 'In Progress',
        createdOn: '2022-01-01',
        goalTopics: ['skullduggery'],
        reasons: ['diffidence', 'nihilism'],
        previousStatus: null,
        isRttapa: true,
        objectives: [{
          id: 2,
          title: 'Objective 1',
          activityReports: [],
          ttaProvdided: '',
          endDate: '2022-01-01',
          reasons: ['there is no reason'],
          status: 'In Progress',
        }],
      },
    ],
  };

  const renderRttapa = () => {
    render(
      <MemoryRouter>
        <UserContext.Provider value={{ user }}>
          <RTTAPA
            recipientId="1"
            regionId="1"
            recipientNameWithRegion="Test Recipient"
            location={{
              pathname: '/recipient/1/region/1/rttapa',
              search: '?goalId[]=1&goalId[]=2',
              hash: '',
            }}
          />
        </UserContext.Provider>
      </MemoryRouter>,
    );
  };

  afterEach(() => {
    fetchMock.restore();
  });

  it('renders the RTTAPA form', async () => {
    fetchMock.get(recipientGoalsUrl, goalsResponse);
    act(() => {
      renderRttapa();
    });

    await waitFor(() => {
      expect(screen.getByText('View goals')).toBeInTheDocument();
      expect(screen.getByText('(2)')).toBeInTheDocument();
    });
  });
});
