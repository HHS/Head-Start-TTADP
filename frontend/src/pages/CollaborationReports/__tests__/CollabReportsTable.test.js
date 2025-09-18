/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import CollabReportsTable from '../components/CollabReportsTable';

// Mock the collaboration reports fetchers
jest.mock('../../../fetchers/collaborationReports', () => ({
  getReportsCSV: jest.fn(),
  getReportsCSVById: jest.fn(),
}));

const { getReportsCSV, getReportsCSVById } = require('../../../fetchers/collaborationReports');

describe('CollabReportsTable', () => {
  const mockSetSortConfig = jest.fn();

  const defaultProps = {
    data: { rows: [], count: 0 },
    title: 'Collaboration Reports',
    requestSort: jest.fn(),
    sortConfig: {
      offset: 0,
      activePage: 1,
      direction: 'asc',
      sortBy: 'name',
      perPage: 10,
    },
    setSortConfig: mockSetSortConfig,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  it('shows loading state when loading is true', () => {
    render(<CollabReportsTable {...defaultProps} loading />);
    expect(screen.getByLabelText('Collaboration reports table loading')).toBeInTheDocument();
  });

  describe('handlePageChange', () => {
    it('calls setSortConfig with new perPage value', () => {
      render(<CollabReportsTable {...defaultProps} />);

      // Find the perPage select dropdown
      const perPageSelect = screen.getByLabelText('Select per page');

      fireEvent.change(perPageSelect, { target: { value: '25' } });

      expect(mockSetSortConfig).toHaveBeenCalledWith(expect.any(Function));
    });

    it('preserves other sortConfig properties when changing perPage', () => {
      render(<CollabReportsTable {...defaultProps} />);

      const perPageSelect = screen.getByLabelText('Select per page');

      fireEvent.change(perPageSelect, { target: { value: '50' } });

      const updateFunction = mockSetSortConfig.mock.calls[0][0];
      const result = updateFunction(defaultProps.sortConfig);

      expect(result).toEqual({
        ...defaultProps.sortConfig,
        perPage: 50,
      });
    });
  });

  describe('Export functionality', () => {
    it('renders Export all menu item', () => {
      render(<CollabReportsTable {...defaultProps} />);

      // Look for the menu button using the correct aria-label
      const menuButton = screen.getByRole('button', { name: /open actions for collaboration reports/i });
      fireEvent.click(menuButton);

      expect(screen.getByText('Export table')).toBeInTheDocument();
    });

    it('calls getReportsCSV when Export all is clicked', async () => {
      render(<CollabReportsTable {...defaultProps} />);

      const menuButton = screen.getByRole('button', { name: /open actions for collaboration reports/i });
      fireEvent.click(menuButton);

      const exportAllButton = screen.getByText('Export table');
      fireEvent.click(exportAllButton);

      await waitFor(() => {
        expect(getReportsCSV).toHaveBeenCalledWith(defaultProps.sortConfig);
      });
    });

    it('does not show Export selected when no reports are selected', () => {
      render(<CollabReportsTable {...defaultProps} />);

      const menuButton = screen.getByRole('button', { name: /open actions for collaboration reports/i });
      fireEvent.click(menuButton);

      expect(screen.queryByText('Export selected rows')).not.toBeInTheDocument();
    });
  });

  describe('Checkbox functionality', () => {
    const dataWithReports = {
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

    it('shows Export selected when reports are selected', async () => {
      render(
        <MemoryRouter>
          <CollabReportsTable {...defaultProps} data={dataWithReports} />
        </MemoryRouter>,
      );

      // Select a checkbox for report with id 1
      const checkbox = screen.getByDisplayValue('1');
      userEvent.click(checkbox);

      // Open menu
      const menuButton = screen.getByRole('button', { name: /open actions for collaboration reports/i });
      fireEvent.click(menuButton);

      expect(screen.getByText('Export selected rows')).toBeInTheDocument();
    });

    it('calls getReportsCSVById when Export selected is clicked', async () => {
      render(
        <MemoryRouter>
          <CollabReportsTable {...defaultProps} data={dataWithReports} />
        </MemoryRouter>,
      );

      // Select checkboxes for reports
      const checkbox1 = screen.getByDisplayValue('1');
      const checkbox2 = screen.getByDisplayValue('2');

      userEvent.click(checkbox1);
      userEvent.click(checkbox2);

      // Open menu and click Export selected
      const menuButton = screen.getByRole('button', { name: /open actions for collaboration reports/i });
      fireEvent.click(menuButton);

      const exportSelectedButton = screen.getByText('Export selected rows');
      fireEvent.click(exportSelectedButton);

      await waitFor(() => {
        expect(getReportsCSVById).toHaveBeenCalledWith(['1', '2'], defaultProps.sortConfig);
      });
    });

    it('updates selectedReports when checkboxes change', async () => {
      render(
        <MemoryRouter>
          <CollabReportsTable {...defaultProps} data={dataWithReports} />
        </MemoryRouter>,
      );

      // Initially no Export selected option
      const menuButton = screen.getByRole('button', { name: /open actions for collaboration reports/i });
      fireEvent.click(menuButton);
      expect(screen.queryByText('Export selected rows')).not.toBeInTheDocument();

      // Close menu, select a checkbox
      fireEvent.click(menuButton);
      const checkbox = screen.getByDisplayValue('1');
      await userEvent.click(checkbox);

      // Now Export selected should be available
      fireEvent.click(menuButton);
      expect(screen.getByText('Export selected rows')).toBeInTheDocument();
    });
  });
});
