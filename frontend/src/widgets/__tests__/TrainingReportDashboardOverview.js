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

    expect(screen.getAllByText('0')).toHaveLength(4);
    expect(screen.getAllByText('0%')).toHaveLength(1);
    expect(screen.getByText('Recipients have at least one active grant click to visually reveal this information')).toBeInTheDocument();
    expect(screen.getByText('Grants served')).toBeInTheDocument();
    expect(screen.getByText('Training reports')).toBeInTheDocument();
    expect(screen.getByText('Participants')).toBeInTheDocument();
    expect(screen.getByText('Hours of TTA')).toBeInTheDocument();
  });

  it('renders with data', async () => {
    const data = {
      numReports: '1',
      totalRecipients: '2',
      recipientPercentage: '3%',
      numGrants: '4',
      numRecipients: '5',
      sumDuration: '6',
      numParticipants: '7',
    };
    renderTest({ ...defaultProps, data });

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('3%')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();

    expect(screen.getByText('Recipients have at least one active grant click to visually reveal this information')).toBeInTheDocument();
    expect(screen.getByText('Grants served')).toBeInTheDocument();
    expect(screen.getByText('Training reports')).toBeInTheDocument();
    expect(screen.getByText('Participants')).toBeInTheDocument();
    expect(screen.getByText('Hours of TTA')).toBeInTheDocument();
  });
});
