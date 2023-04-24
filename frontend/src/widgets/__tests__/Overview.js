import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
} from '@testing-library/react';
import { OverviewWidget as Overview } from '../Overview';

describe('Overview', () => {
  const data = {
    numGrants: '1',
    numOtherEntities: '2',
    numReports: '3',
    numParticipants: '4',
    sumDuration: '5',
  };

  it('renders the Overview component with a caption', () => {
    render(<Overview data={data} loading={false} tableCaption="Test caption" />);
    expect(screen.getByText('Test caption')).toBeInTheDocument();
  });

  it('uses the default caption', () => {
    render(<Overview data={data} loading={false} />);
    expect(screen.getByText('TTA overview')).toBeInTheDocument();
  });
});
