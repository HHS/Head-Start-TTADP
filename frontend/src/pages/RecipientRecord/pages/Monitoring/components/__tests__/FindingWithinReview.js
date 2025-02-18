/* eslint-disable max-len */
import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import { MemoryRouter } from 'react-router';
import FindingWithinReview from '../FindingWithinReview';
import UserContext from '../../../../../../UserContext';

describe('FindingWithinReview', () => {
  const mockFinding = {
    citation: '12345',
    status: 'Open',
    findingType: 'Type A',
    category: 'Category 1',
    correctionDeadline: '2023-12-31',
    objectives: [
      {
        activityReports: [
          {
            displayId: 'AR-1',
            id: '1',
          },
          {
            displayId: 'AR-2',
            id: '2',
          },
        ],
        endDate: '2023-11-30',
        status: 'In Progress',
        title: 'Objective 1',
        topics: ['Topic 1', 'Topic 2'],
      },
    ],
  };

  const mockRegionId = 1;

  const renderTest = (finding = mockFinding) => render(
    <UserContext.Provider value={{ user: { roles: [], id: 1, email: 'test@test.gov' } }}>
      <MemoryRouter>
        <FindingWithinReview finding={finding} regionId={mockRegionId} />
      </MemoryRouter>
    </UserContext.Provider>,
  );

  it('renders ReviewObjective components when objectives are present', () => {
    const { getByText } = renderTest();

    expect(getByText('Objective 1')).toBeInTheDocument();
  });

  it('renders NoTtaProvidedAgainst component when no objectives are present', () => {
    const findingWithoutObjectives = { ...mockFinding, objectives: [] };
    const { getByText } = renderTest(findingWithoutObjectives);

    expect(getByText(/No TTA work has been performed against this citation/i)).toBeInTheDocument();
  });
});
