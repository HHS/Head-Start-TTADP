/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CollabReportsTable from '../components/CollabReportsTable';

// TODO: Verify these tests work as expected
describe('CollabReportsTable', () => {
  const defaultProps = {
    reports: [],
    title: 'Collaboration Reports',
  };

  it('renders the title', () => {
    render(<CollabReportsTable {...defaultProps} />);
    expect(screen.getByText('Collaboration Reports')).toBeInTheDocument();
  });

  it('renders empty message when no reports', () => {
    render(<CollabReportsTable {...defaultProps} emptyMsg="No reports available" />);
    expect(screen.getByText('No reports available')).toBeInTheDocument();
  });

  it('renders create message when showCreateMsgOnEmpty is true', () => {
    render(<CollabReportsTable {...defaultProps} showCreateMsgOnEmpty />);
    expect(screen.getByText('You have no Collaboration Reports')).toBeInTheDocument();
    expect(screen.getByText(/Document your work connecting Head Start programs/)).toBeInTheDocument();
    expect(screen.getByText(/To get started, click the "New Collaboration Report" button./)).toBeInTheDocument();
  });

  it('renders table when reports are present', () => {
    const reports = [
      { id: 1, name: 'Report 1', regionId: 1 },
      { id: 2, name: 'Report 2', regionId: 1 },
    ];
    render(<CollabReportsTable {...defaultProps} reports={reports} />);
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByLabelText('Select or de-select all reports')).toBeInTheDocument();
  });

  it('selects all checkboxes when select all is clicked', () => {
    const reports = [
      { id: 1, name: 'Report 1', regionId: 1 },
      { id: 2, name: 'Report 2', regionId: 1 },
    ];
    render(<CollabReportsTable {...defaultProps} reports={reports} />);
    const selectAllCheckbox = screen.getByLabelText('Select or de-select all reports');
    expect(selectAllCheckbox).not.toBeChecked();
    fireEvent.click(selectAllCheckbox);
    expect(selectAllCheckbox).toBeChecked();
  });

  it('shows loading state when loading is true', () => {
    render(<CollabReportsTable {...defaultProps} loading />);
    expect(screen.getByLabelText('Collaboration reports table loading')).toBeInTheDocument();
  });

  it('resets checkboxes when reports change', () => {
    const { rerender } = render(
      <CollabReportsTable {...defaultProps} reports={[{ id: 1 }]} />,
    );
    const selectAllCheckbox = screen.getByLabelText('Select or de-select all reports');
    fireEvent.click(selectAllCheckbox);
    expect(selectAllCheckbox).toBeChecked();

    // Change reports prop
    rerender(<CollabReportsTable {...defaultProps} reports={[{ id: 2 }]} />);
    expect(screen.getByLabelText('Select or de-select all reports')).not.toBeChecked();
  });
});
