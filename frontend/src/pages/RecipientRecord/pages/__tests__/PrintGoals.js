import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen,
} from '@testing-library/react';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import fetchMock from 'fetch-mock';
import PrintGoals from '../PrintGoals';
import UserContext from '../../../../UserContext';
import { SCOPE_IDS } from '../../../../Constants';

const memoryHistory = createMemoryHistory();

const RECIPIENT_ID = '123456';
const REGION_ID = '1';

describe('PrintGoals', () => {
  const goals = [
    {
      id: 4598,
      goalStatus: 'In Progress',
      createdOn: '2021-06-15',
      goalText: 'This is goal text 1.',
      goalTopics: ['Human Resources', 'Safety Practices', 'Program Planning and Services'],
      objectiveCount: 5,
      goalNumber: 'R14-G-4598',
      reasons: ['Monitoring | Deficiency', 'Monitoring | Noncompliance'],
      objectives: [],
    },
    {
      id: 4599,
      goalStatus: 'Closed',
      createdOn: '2021-06-15',
      goalText: 'This is goal text 2.',
      goalTopics: ['Human Resources', 'Safety Practices'],
      objectiveCount: 5,
      goalNumber: 'R14-G-4598',
      reasons: ['Monitoring | Deficiency', 'Monitoring | Noncompliance'],
      objectives: [
        {
          id: 1,
          title: 'this is an objective',
          grantNumber: '123',
          endDate: '01/01/02',
          reasons: ['Empathy', 'Generosity', 'Friendship'],
          status: 'Completed',
        },
      ],
    },
  ];

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

  const renderPrintGoals = () => {
    const location = {
      state: null, hash: '', pathname: '', search: '',
    };

    render(
      <Router history={memoryHistory}>
        <UserContext.Provider value={{ user }}>
          <PrintGoals
            location={location}
            recipientId={RECIPIENT_ID}
            regionId={REGION_ID}
          />
        </UserContext.Provider>
      </Router>,
    );
  };

  beforeAll(async () => {
    fetchMock.get(`/api/recipient/${RECIPIENT_ID}/region/${REGION_ID}/goals?sortBy=updatedAt&sortDir=desc&offset=0&limit=false`, { count: 5, goalRows: goals });
  });

  it('renders goals from API', async () => {
    renderPrintGoals();
    expect(await screen.findByText('This is goal text 1.')).toBeVisible();
    expect(await screen.findByText('Human Resources, Safety Practices, Program Planning and Services')).toBeVisible();
    expect(await screen.findByText('This is goal text 2.')).toBeVisible();
    expect(await screen.findByText('Human Resources, Safety Practices')).toBeVisible();
    expect(await screen.findByText('this is an objective')).toBeVisible();
    expect(await screen.findByText('Empathy, Generosity, Friendship')).toBeVisible();
  });
});
