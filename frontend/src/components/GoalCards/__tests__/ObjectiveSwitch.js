import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ObjectiveSwitch } from '../GoalCard';
import UserContext from '../../../UserContext';

describe('ObjectiveSwitch', () => {
  it('renders goal objectives', async () => {
    const objective = {
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
    };
    render(
      <UserContext.Provider value={{ user: {} }}>
        <MemoryRouter>
          <ObjectiveSwitch objective={objective} objectivesExpanded />
        </MemoryRouter>
      </UserContext.Provider>,
    );
    expect(screen.getByText('This is an objective')).toBeInTheDocument();
    expect(screen.getByText('2020-01-01')).toBeInTheDocument();
    expect(screen.getByText('reason1')).toBeInTheDocument();
    expect(screen.getByText('reason2')).toBeInTheDocument();
    const link = screen.getByText('r-123');
    expect(link).toHaveAttribute('href', '/activity-reports/legacy/123');
  });
});
