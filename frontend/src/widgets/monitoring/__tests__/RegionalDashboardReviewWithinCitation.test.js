/* eslint-disable react/prop-types */
/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import RegionalDashboardReviewWithinCitation from '../RegionalDashboardReviewWithinCitation';

jest.mock('../../../pages/RecipientRecord/pages/Monitoring/components/SpecialistTags', () => ({ specialists }) => (
  <div data-testid="specialist-tags" data-count={specialists.length} />
));

jest.mock('../../../pages/RecipientRecord/pages/Monitoring/components/NoTtaProvidedAgainst', () => () => (
  <p data-testid="no-tta-provided">No TTA work has been performed against this citation.</p>
));

jest.mock('../../../pages/RecipientRecord/pages/Monitoring/components/ReviewObjective', () => ({ objective, regionId }) => (
  <div
    data-testid="review-objective"
    data-title={objective.title}
    data-region={regionId}
  />
));

const baseObjective = {
  title: 'Objective title',
  activityReports: ['14AR12345'],
  endDate: '06/24/2024',
  topics: ['Safety Practices'],
  status: 'In Progress',
};

const baseReview = {
  name: '241234F2',
  reviewType: 'FA-2',
  reviewReceived: '05/20/2024',
  outcome: 'Noncompliant',
  findingStatus: 'Active',
  specialists: [],
  objectives: [],
};

function renderComponent(reviewOverrides = {}, regionId = 1) {
  return render(
    <RegionalDashboardReviewWithinCitation
      review={{ ...baseReview, ...reviewOverrides }}
      regionId={regionId}
    />,
  );
}

describe('RegionalDashboardReviewWithinCitation', () => {
  it('renders review name', () => {
    renderComponent();
    expect(screen.getByText('241234F2')).toBeInTheDocument();
  });

  it('renders review type', () => {
    renderComponent();
    expect(screen.getByText('FA-2')).toBeInTheDocument();
  });

  it('renders review received date', () => {
    renderComponent();
    expect(screen.getByText('05/20/2024')).toBeInTheDocument();
  });

  it('renders review outcome', () => {
    renderComponent();
    expect(screen.getByText('Noncompliant')).toBeInTheDocument();
  });

  it('does not render TTA specialists section when specialists array is empty', () => {
    renderComponent({ specialists: [] });
    expect(screen.queryByTestId('specialist-tags')).not.toBeInTheDocument();
  });

  it('renders TTA specialists section when specialists are present', () => {
    renderComponent({ specialists: [{ name: 'Alice', roles: ['GS'] }] });
    expect(screen.getByTestId('specialist-tags')).toBeInTheDocument();
  });

  it('renders NoTtaProvidedAgainst when objectives array is empty', () => {
    renderComponent({ objectives: [] });
    expect(screen.getByTestId('no-tta-provided')).toBeInTheDocument();
  });

  it('does not render NoTtaProvidedAgainst when objectives are present', () => {
    renderComponent({ objectives: [baseObjective] });
    expect(screen.queryByTestId('no-tta-provided')).not.toBeInTheDocument();
  });

  it('renders a ReviewObjective for each objective', () => {
    const objectives = [
      { ...baseObjective, title: 'Objective A' },
      { ...baseObjective, title: 'Objective B' },
    ];
    renderComponent({ objectives });
    const items = screen.getAllByTestId('review-objective');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveAttribute('data-title', 'Objective A');
    expect(items[1]).toHaveAttribute('data-title', 'Objective B');
  });

  it('passes regionId to ReviewObjective', () => {
    renderComponent({ objectives: [baseObjective] }, 3);
    expect(screen.getByTestId('review-objective')).toHaveAttribute('data-region', '3');
  });
});
