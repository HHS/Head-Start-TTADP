import '@testing-library/jest-dom';
import React from 'react';
import { render, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import FinalGoalCard from '../FinalGoalCard';
import UserContext from '../../../../../../UserContext';

describe('FinalGoalCard', () => {
  const baseGoals = [{
    id: 4598,
    ids: [4598],
    goalStatus: 'Suspended',
    createdOn: '2021-06-15',
    goalText: 'This is goal text 1.',
    goalTopics: ['Human Resources', 'Safety Practices', 'Program Planning and Services'],
    objectiveCount: 5,
    goalNumbers: ['G-4598'],
    reasons: ['Monitoring | Deficiency', 'Monitoring | Noncompliance'],
    objectives: [
      {
        id: 123,
        title: 'This is an objective',
        endDate: '2020-01-01',
        reasons: ['reason1', 'reason2'],
        status: 'In Progress',
        grantNumbers: ['grant1', 'grant2'],
        topics: [],
        activityReports: [
          {
            displayId: 'r-123',
            legacyId: '123',
            number: '678',
            id: 678,
            endDate: '2020-01-01',
          },
        ],
      },
      {
        id: 124,
        title: 'This is an objective 2',
        endDate: '2020-03-01',
        reasons: ['reason1', 'reason2'],
        status: 'In Progress',
        grantNumbers: ['grant1', 'grant2'],
        topics: [],
        activityReports: [
          {
            displayId: 'r-123',
            legacyId: '123',
            number: '678',
            id: 678,
            endDate: '2020-01-01',
          },
        ],
      },
    ],
  },
  {
    id: 4600,
    ids: [4600],
    goalStatus: 'Not Started',
    createdOn: '2021-07-15',
    goalText: 'This is goal text 2.',
    goalTopics: ['Program Planning and Services'],
    objectiveCount: 1,
    goalNumbers: ['G-4600'],
    reasons: ['Monitoring | Deficiency'],
    objectives: [{
      id: 125,
      title: 'This is an objective 2',
      endDate: '2020-04-01',
      reasons: ['reason1', 'reason2'],
      status: 'In Progress',
      grantNumbers: ['grant1', 'grant2'],
      topics: [],
      activityReports: [
        {
          displayId: 'r-123',
          legacyId: '123',
          number: '678',
          id: 678,
          endDate: '2020-01-01',
        },
      ],
    }],
  },
  ];

  const renderTest = (goals = baseGoals, selectedGoalIds = ['4598', '4600'], finalGoalId = '4600') => {
    const user = {
      name: 'name',
      id: 1,
      flags: [],
      roles: [],
      permissions: [],
    };
    render(
      <MemoryRouter>
        <UserContext.Provider value={{ user }}>
          <FinalGoalCard
            goals={goals}
            selectedGoalIds={selectedGoalIds}
            finalGoalId={finalGoalId}
          />
        </UserContext.Provider>
      </MemoryRouter>,
    );
  };

  it('shows the correct status for suspended + not started', async () => {
    act(() => renderTest());

    const label = document.querySelector('.ttahub-final-goal--status .ttahub-final-goal--status-label');
    expect(label.textContent).toBe('Suspended');
  });
  it('shows the correct status for suspended + in progress', async () => {
    act(() => renderTest([
      baseGoals[0],
      {
        ...baseGoals[1],
        goalStatus: 'In Progress',
      },
    ]));

    const label = document.querySelector('.ttahub-final-goal--status .ttahub-final-goal--status-label');
    expect(label.textContent).toBe('In progress');
  });
  it('shows the correct status for closed + not started', async () => {
    act(() => renderTest([
      {
        ...baseGoals[0],
        goalStatus: 'Closed',
      },
      {
        ...baseGoals[1],
        goalStatus: 'Not Started',
      },
    ]));

    const label = document.querySelector('.ttahub-final-goal--status .ttahub-final-goal--status-label');
    expect(label.textContent).toBe('Closed');
  });
  it('shows the correct status for closed + in progress', async () => {
    act(() => renderTest([
      {
        ...baseGoals[0],
        goalStatus: 'Closed',
      },
      {
        ...baseGoals[1],
        goalStatus: 'In Progress',
      },
    ]));
    const label = document.querySelector('.ttahub-final-goal--status .ttahub-final-goal--status-label');
    expect(label.textContent).toBe('In progress');
  });
  it('shows the correct status for in progress + not started', async () => {
    act(() => renderTest([
      {
        ...baseGoals[0],
        goalStatus: 'Not Started',
      },
      {
        ...baseGoals[1],
        goalStatus: 'In Progress',
      },
    ]));

    const label = document.querySelector('.ttahub-final-goal--status .ttahub-final-goal--status-label');
    expect(label.textContent).toBe('In progress');
  });
  it('shows the correct status for 2 not started', async () => {
    act(() => renderTest([
      {
        ...baseGoals[0],
        goalStatus: 'Not Started',
      },
      {
        ...baseGoals[1],
        goalStatus: 'Not Started',
      },
    ]));

    const label = document.querySelector('.ttahub-final-goal--status .ttahub-final-goal--status-label');
    expect(label.textContent).toBe('Not started');
  });
  it('shows the correct status for draft + not started', async () => {
    act(() => renderTest([
      {
        ...baseGoals[0],
        goalStatus: 'Not Started',
      },
      {
        ...baseGoals[1],
        goalStatus: 'Draft',
      },
    ]));

    const label = document.querySelector('.ttahub-final-goal--status .ttahub-final-goal--status-label');
    expect(label.textContent).toBe('Not started');
  });
  it('shows the correct status for 2 draft', async () => {
    act(() => renderTest([
      {
        ...baseGoals[0],
        goalStatus: 'Draft',
      },
      {
        ...baseGoals[1],
        goalStatus: 'Draft',
      },
    ]));

    const label = document.querySelector('.ttahub-final-goal--status .ttahub-final-goal--status-label');
    expect(label.textContent).toBe('Draft');
  });
});
