import React from 'react';
import { render, act, screen } from '@testing-library/react';
import { GOAL_STATUS } from '@ttahub/common';
import fetchMock from 'fetch-mock';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import GoalDataController from '../GoalDataController';
import UserContext from '../../../UserContext';
import AppLoadingContext from '../../../AppLoadingContext';

describe('GoalDataController', () => {
  const DEFAULT_USER = {
    name: '',
    id: 1,
  };
  const baseGoalsResponse = [{
    id: 4598,
    ids: [4598],
    goalStatus: GOAL_STATUS.IN_PROGRESS,
    createdOn: '2021-06-15',
    goalText: 'This is goal text 1.',
    goalTopics: ['Human Resources', 'Safety Practices', 'Program Planning and Services'],
    objectiveCount: 5,
    goalNumbers: ['G-4598'],
    reasons: ['Monitoring | Deficiency', 'Monitoring | Noncompliance'],
    objectives: [],
    collaborators: [],
  }];

  const baseStatusResponse = {
    total: 0,
    [GOAL_STATUS.NOT_STARTED]: 0,
    [GOAL_STATUS.IN_PROGRESS]: 0,
    [GOAL_STATUS.CLOSED]: 0,
    [GOAL_STATUS.SUSPENDED]: 0,
  };

  const response = {
    goalRows: baseGoalsResponse,
    status: baseStatusResponse,
  };

  const REGION_ID = 1;
  const RECIPIENT_ID = 1;

  const defaultProps = {
    filters: [],
    recipientId: String(RECIPIENT_ID),
    regionId: String(REGION_ID),
    hasActiveGrants: true,
    showNewGoals: false,
  };
  const history = createMemoryHistory();

  const renderTest = (props = {}, locationState = undefined) => {
    history.location.state = locationState;

    render(
      <AppLoadingContext.Provider value={{ setIsAppLoading: () => {}, isAppLoading: false }}>
        <UserContext.Provider value={{ user: DEFAULT_USER }}>
          <Router history={history}>
            {/* eslint-disable-next-line react/jsx-props-no-spreading */}
            <GoalDataController {...defaultProps} {...props} />
          </Router>
        </UserContext.Provider>
      </AppLoadingContext.Provider>,
    );
  };

  beforeEach(async () => {
    fetchMock.get(
      `/api/communication-logs/region/${REGION_ID}/recipient/${RECIPIENT_ID}?sortBy=communicationDate&direction=desc&offset=0&limit=5&format=json&purpose.in[]=RTTAPA%20updates&purpose.in[]=RTTAPA%20Initial%20Plan%20%2F%20New%20Recipient`,
      {
        count: 1,
        rows: [{
          id: 1,
          userId: 1,
          recipientId: RECIPIENT_ID,
          data: {
            id: 0, files: [], notes: '', method: 'Phone', result: 'New TTA declined', userId: 355, purpose: 'RTTAPA Initial Plan / New Recipient', duration: 0.5, regionId: '1', pageState: { 1: 'Complete', 2: 'Not started', 3: 'Not started' }, pocComplete: false, recipientId: '', communicationDate: '11/23/2023', recipientNextSteps: [{ note: '', completeDate: '' }], specialistNextSteps: [{ note: '', completeDate: '' }],
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          authorName: 'Ted User',
          author: { name: 'Ted User', id: 1 },
        }],
      },
    );
    fetchMock.get(`/api/goals/similar/region/${REGION_ID}/recipient/${RECIPIENT_ID}?cluster=true`, []);
  });

  afterEach(async () => {
    fetchMock.restore();
  });

  it('fetches goals in the correct order if no location state specified', async () => {
    const url = ` /api/recipient/${RECIPIENT_ID}/region/${REGION_ID}/goals?sortBy=goalStatus&sortDir=asc&offset=0&limit=10`;
    fetchMock.get(url, response);
    act(() => {
      renderTest(
        {}, // props
      );
    });

    expect(fetchMock.called(url)).toBe(true);
  });

  it('shows what tell it to', async () => {
    const url = ` /api/recipient/${RECIPIENT_ID}/region/${REGION_ID}/goals?sortBy=goalStatus&sortDir=asc&offset=0&limit=10`;
    fetchMock.get(url, response);
    act(() => {
      renderTest(
        {}, // props
      );
    });

    expect(fetchMock.called(url)).toBe(true);

    expect(await screen.findByText('RTTAPA Initial Plan / New Recipient')).toBeInTheDocument();
  });
});
