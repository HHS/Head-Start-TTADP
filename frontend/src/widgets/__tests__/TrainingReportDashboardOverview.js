import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { TrainingReportDashboardOverview } from '../TrainingReportDashboardOverview';

describe('TrainingReportDashboardOverview', () => {
  const defaultProps = {
    filters: [],
    showTooltips: true,
    loading: false,
  };

  // eslint-disable-next-line react/jsx-props-no-spreading
  const renderTest = (props) => render(<TrainingReportDashboardOverview {...props} />);

  it('renders without explicit data', async () => {
    renderTest(defaultProps);

    expect(screen.getAllByText('0')).toHaveLength(3);
    expect(screen.getByText('0 sessions')).toBeInTheDocument();
    expect(screen.getAllByText('0%')).toHaveLength(1);
    expect(screen.getAllByText('Recipients have at least one active grant')[0]).toBeInTheDocument();
    expect(screen.getByText('Grants served')).toBeInTheDocument();
    expect(screen.getByText('across 0 Training Reports')).toBeInTheDocument();
    expect(screen.getByText('Participants')).toBeInTheDocument();
    expect(screen.getByText('Hours of TTA')).toBeInTheDocument();
  });

  it('renders with data', async () => {
    const data = {
      numReports: '2',
      totalRecipients: '1',
      recipientPercentage: '3%',
      numGrants: '4',
      numRecipients: '5',
      sumDuration: '6',
      numParticipants: '7',
      numSessions: '2',
    };
    renderTest({ ...defaultProps, data });

    expect(screen.getByText('2 sessions')).toBeInTheDocument();
    expect(screen.getByText('3%')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();

    expect(screen.getAllByText('Recipients have at least one active grant')[0]).toBeInTheDocument();
    expect(screen.getByText('Grants served')).toBeInTheDocument();
    expect(screen.getByText('across 2 Training Reports')).toBeInTheDocument();
    expect(screen.getByText('Participants')).toBeInTheDocument();
    expect(screen.getByText('Hours of TTA')).toBeInTheDocument();
  });
});
