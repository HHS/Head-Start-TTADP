/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import CollabReportsTable from '../components/CollabReportsTable';

describe('CollabReportsTable', () => {
  const defaultProps = {
    data: { rows: [], count: 0 },
    title: 'Collaboration Reports',
    requestSort: jest.fn(),
    sortConfig: {},
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
    const data = {
      rows: [
        {
          id: 1,
          displayId: 'R01-1',
          name: 'Report 1',
          startDate: '2024-01-01',
          author: { fullName: 'John Doe' },
          createdAt: '2024-01-01T10:00:00Z',
          collaboratingSpecialists: [{ fullName: 'Jane Smith' }],
          updatedAt: '2024-01-02T10:00:00Z',
          link: '/collaboration-reports/1',
        },
        {
          id: 2,
          displayId: 'R01-2',
          name: 'Report 2',
          startDate: '2024-01-02',
          author: { fullName: 'Bob Johnson' },
          createdAt: '2024-01-02T10:00:00Z',
          collaboratingSpecialists: [{ fullName: 'Alice Brown' }],
          updatedAt: '2024-01-03T10:00:00Z',
          link: '/collaboration-reports/2',
        },
      ],
      count: 2,
    };
    render(<MemoryRouter><CollabReportsTable {...defaultProps} data={data} /></MemoryRouter>);
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it.skip('selects all checkboxes when select all is clicked', () => {
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

  // TODO: re-enable
  it.skip('resets checkboxes when reports change', () => {
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
