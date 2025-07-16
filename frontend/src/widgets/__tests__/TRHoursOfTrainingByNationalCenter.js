import React from 'react';
import '@testing-library/jest-dom';
import {
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import TRHoursOfTrainingByNationalCenter from '../TRHoursOfTrainingByNationalCenter';

describe('TRHoursOfTrainingByNationalCenter', () => {
  it('should render', () => {
    render(<TRHoursOfTrainingByNationalCenter />);
    const heading = screen.getByText('Hours of training by National Center');
    expect(heading).toBeInTheDocument();
  });

  it('toggles between graph and table', () => {
    render(<TRHoursOfTrainingByNationalCenter />);

    // Get ellipsis menu and click "display table"
    const menuButton = screen.getByTestId('context-menu-actions-btn');
    fireEvent.click(menuButton);
    const tableButton = screen.getByText('Display table');
    expect(tableButton).toBeInTheDocument();

    // Click the "Display table button" and confirm it switches to a table
    fireEvent.click(tableButton);
    const table = screen.getByTestId('table');
    expect(table).toBeInTheDocument();
  });
});
