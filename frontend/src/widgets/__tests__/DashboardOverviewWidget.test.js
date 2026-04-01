import React from 'react';
import { render, screen } from '@testing-library/react';
import { DashboardOverviewWidget } from '../DashboardOverview';

/* eslint-disable react/prop-types */
jest.mock('../DashboardOverviewContainer', () => ({
  DashboardOverviewContainer: ({ fieldData }) => (
    <div>
      {fieldData.map((field) => (
        <div key={field.key}>
          <span>{field.label1}</span>
          {field.label2 ? <span>{field.label2}</span> : null}
          <span>{field.data}</span>
        </div>
      ))}
    </div>
  ),
}));

describe('DashboardOverviewWidget', () => {
  it('renders monitoring overview fields with mapped ratio values', () => {
    render(
      <DashboardOverviewWidget
        showTooltips
        loading={false}
        fields={[
          'Compliant follow-up reviews with TTA support',
          'Active deficient citations with TTA support',
          'Active noncompliant citations with TTA support',
        ]}
        data={{
          percentCompliantFollowUpReviewsWithTtaSupport: '42%',
          totalCompliantFollowUpReviewsWithTtaSupport: '5',
          totalCompliantFollowUpReviews: '12',
          percentActiveDeficientCitationsWithTtaSupport: '50%',
          totalActiveDeficientCitationsWithTtaSupport: '2',
          totalActiveDeficientCitations: '4',
          percentActiveNoncompliantCitationsWithTtaSupport: '25%',
          totalActiveNoncompliantCitationsWithTtaSupport: '1',
          totalActiveNoncompliantCitations: '4',
        }}
      />,
    );

    expect(screen.getByText('Compliant follow-up reviews with TTA support')).toBeInTheDocument();
    expect(screen.getByText('5 of 12')).toBeInTheDocument();
    expect(screen.getByText('42%')).toBeInTheDocument();

    expect(screen.getByText('Active deficient citations with TTA support')).toBeInTheDocument();
    expect(screen.getByText('2 of 4')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();

    expect(screen.getByText('Active noncompliant citations with TTA support')).toBeInTheDocument();
    expect(screen.getByText('1 of 4')).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();
  });

  it('ignores unknown fields without crashing', () => {
    render(
      <DashboardOverviewWidget
        loading={false}
        fields={['Unknown field', 'Activity reports']}
        data={{ numReports: '3' }}
      />,
    );

    expect(screen.queryByText('Unknown field')).not.toBeInTheDocument();
    expect(screen.getByText('Activity reports')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('omits ratio labels when active/compliant totals are zero', () => {
    render(
      <DashboardOverviewWidget
        loading={false}
        fields={[
          'Compliant follow-up reviews with TTA support',
          'Active deficient citations with TTA support',
          'Active noncompliant citations with TTA support',
        ]}
        data={{
          percentCompliantFollowUpReviewsWithTtaSupport: '0%',
          totalCompliantFollowUpReviewsWithTtaSupport: '0',
          totalCompliantFollowUpReviews: '0',
          percentActiveDeficientCitationsWithTtaSupport: '0%',
          totalActiveDeficientCitationsWithTtaSupport: '0',
          totalActiveDeficientCitations: '0',
          percentActiveNoncompliantCitationsWithTtaSupport: '0%',
          totalActiveNoncompliantCitationsWithTtaSupport: '0',
          totalActiveNoncompliantCitations: '0',
        }}
      />,
    );

    expect(screen.queryByText('0 of 0')).not.toBeInTheDocument();
    expect(screen.getAllByText('0%')).toHaveLength(3);
  });
});
