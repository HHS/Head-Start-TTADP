import React from 'react';
import { render, act } from '@testing-library/react';
import fetchMock from 'fetch-mock';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import GoalDataController from '../GoalDataController';
import UserContext from '../../../UserContext';

describe('GoalDataController', () => {
  const DEFAULT_USER = {
    name: '',
    id: 1,
  };
  const baseGoalsResponse = [{
    id: 4598,
    ids: [4598],
    goalStatus: 'In Progress',
    createdOn: '2021-06-15',
    goalText: 'This is goal text 1.',
    goalTopics: ['Human Resources', 'Safety Practices', 'Program Planning and Services'],
    objectiveCount: 5,
    goalNumbers: ['G-4598'],
    reasons: ['Monitoring | Deficiency', 'Monitoring | Noncompliance'],
    objectives: [],
  }];

  const baseStatusResponse = {
    total: 0,
    'Not started': 0,
    'In progress': 0,
    Closed: 0,
    Suspended: 0,
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
    canMergeGoals: true,
  };
  const history = createMemoryHistory();

  const renderTest = (props = {}, locationState = undefined) => {
    history.location.state = locationState;

    render(
      <UserContext.Provider value={{ user: DEFAULT_USER }}>
        <Router history={history}>
          {/* eslint-disable-next-line react/jsx-props-no-spreading */}
          <GoalDataController {...defaultProps} {...props} />
        </Router>
      </UserContext.Provider>,
    );
  };

  beforeEach(async () => {
    fetchMock.get('/api/goals/similar/1?cluster=true', []);
  });

  afterEach(async () => {
    fetchMock.restore();
  });

  it('fetches goals in the correct order if specified in history state', async () => {
    const url = `/api/recipient/${RECIPIENT_ID}/region/${REGION_ID}/goals?sortBy=mergedGoals&sortDir=asc&offset=0&limit=10&goalIds=1&goalIds=2`;
    fetchMock.get(url, response);
    act(() => {
      renderTest(
        {}, // props
        {
          mergedGoals: [1, 2], // location state
        },
      );
    });

    expect(fetchMock.called(url)).toBe(true);
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
});
