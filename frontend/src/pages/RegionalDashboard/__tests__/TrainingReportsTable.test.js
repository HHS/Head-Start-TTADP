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
import TrainingReportsTable from '../components/TrainingReportsTable';

// Mock the session fetchers
jest.mock('../../../fetchers/session', () => ({
  getSessionReportsCSV: jest.fn(),
  getSessionReportsCSVById: jest.fn(),
}));

const { getSessionReportsCSV, getSessionReportsCSVById } = require('../../../fetchers/session');

describe('TrainingReportsTable', () => {
  const mockSetSortConfig = jest.fn();

  const mockReportData = {
    rows: [
      {
        id: 1,
        eventId: 'R01-TR-23-1037',
        eventName: 'Test Event 1',
        sessionName: 'Session 1',
        startDate: '2024-01-01',
        endDate: '2024-01-02',
        objectiveTopics: ['Topic 1', 'Topic 2'],
        goalTemplates: [{ standard: 'Goal 1' }, { standard: 'Goal 2' }],
      },
      {
        id: 2,
        eventId: 'R01-TR-23-1038',
        eventName: 'Test Event 2',
        sessionName: 'Session 2',
        startDate: '2024-02-01',
        endDate: '2024-02-02',
        objectiveTopics: ['Topic 3'],
        goalTemplates: [{ standard: 'Goal 3' }],
      },
    ],
    count: 2,
  };

  const defaultProps = {
    data: { rows: [], count: 0 },
    title: 'Training Reports',
    requestSort: jest.fn(),
    sortConfig: {
      offset: 0,
      activePage: 1,
      direction: 'desc',
      sortBy: 'eventId',
      perPage: 10,
    },
    setSortConfig: mockSetSortConfig,
    filters: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the title', () => {
    render(<TrainingReportsTable {...defaultProps} />);
    expect(screen.getByText('Training Reports')).toBeInTheDocument();
  });

  it('renders empty message when no reports', () => {
    render(<TrainingReportsTable {...defaultProps} emptyMsg="No reports available" />);
    expect(screen.getByText('No reports available')).toBeInTheDocument();
  });

  it('renders table when reports are present', () => {
    render(
      <MemoryRouter>
        <TrainingReportsTable {...defaultProps} data={mockReportData} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('shows loading state when loading is true', () => {
    render(<TrainingReportsTable {...defaultProps} loading />);
    expect(screen.getByLabelText('Training reports table loading')).toBeInTheDocument();
  });

  it('renders event IDs as links', () => {
    render(
      <MemoryRouter>
        <TrainingReportsTable {...defaultProps} data={mockReportData} />
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: 'R01-TR-23-1037' });
    expect(link).toHaveAttribute('href', '/training-report/view/1037?back_link=hide');
  });

  describe('handlePageChange', () => {
    it('updates sortConfig with new activePage and offset on page change', () => {
      const manyRowsData = {
        rows: Array.from({ length: 10 }, (_, i) => ({
          id: i + 1,
          eventId: `R01-TR-23-${1037 + i}`,
          eventName: `Test Event ${i + 1}`,
          sessionName: `Session ${i + 1}`,
          startDate: '2024-01-01',
          endDate: '2024-01-02',
          objectiveTopics: ['Topic 1'],
          goalTemplates: [{ standard: 'Goal 1' }],
        })),
        count: 25,
      };

      render(
        <MemoryRouter>
          <TrainingReportsTable {...defaultProps} data={manyRowsData} />
        </MemoryRouter>,
      );

      // Click page 2
      const page2Button = screen.getByRole('button', { name: /page 2/i });
      fireEvent.click(page2Button);

      expect(mockSetSortConfig).toHaveBeenCalledWith(expect.any(Function));

      const updateFunction = mockSetSortConfig.mock.calls[0][0];
      const result = updateFunction(defaultProps.sortConfig);

      expect(result).toEqual({
        ...defaultProps.sortConfig,
        activePage: 2,
        offset: 10,
      });
    });
  });

  describe('Export functionality', () => {
    it('renders Export table menu item', () => {
      render(
        <MemoryRouter>
          <TrainingReportsTable {...defaultProps} data={mockReportData} />
        </MemoryRouter>,
      );

      const menuButton = screen.getByRole('button', { name: /open actions for training reports/i });
      fireEvent.click(menuButton);

      expect(screen.getByText('Export table')).toBeInTheDocument();
    });

    it('calls getSessionReportsCSV when Export table is clicked', async () => {
      render(
        <MemoryRouter>
          <TrainingReportsTable {...defaultProps} data={mockReportData} />
        </MemoryRouter>,
      );

      const menuButton = screen.getByRole('button', { name: /open actions for training reports/i });
      fireEvent.click(menuButton);

      const exportAllButton = screen.getByText('Export table');
      fireEvent.click(exportAllButton);

      await waitFor(() => {
        expect(getSessionReportsCSV).toHaveBeenCalledWith(
          defaultProps.sortConfig,
          defaultProps.filters,
        );
      });
    });

    it('does not show Export selected when no reports are selected', () => {
      render(
        <MemoryRouter>
          <TrainingReportsTable {...defaultProps} data={mockReportData} />
        </MemoryRouter>,
      );

      const menuButton = screen.getByRole('button', { name: /open actions for training reports/i });
      fireEvent.click(menuButton);

      expect(screen.queryByText('Export selected rows')).not.toBeInTheDocument();
    });
  });

  describe('Checkbox functionality', () => {
    it('shows Export selected when reports are selected', async () => {
      render(
        <MemoryRouter>
          <TrainingReportsTable {...defaultProps} data={mockReportData} />
        </MemoryRouter>,
      );

      const checkbox = screen.getByDisplayValue('1');
      userEvent.click(checkbox);

      const menuButton = screen.getByRole('button', { name: /open actions for training reports/i });
      fireEvent.click(menuButton);

      expect(screen.getByText('Export selected rows')).toBeInTheDocument();
    });

    it('calls getSessionReportsCSVById when Export selected is clicked', async () => {
      render(
        <MemoryRouter>
          <TrainingReportsTable {...defaultProps} data={mockReportData} />
        </MemoryRouter>,
      );

      const checkbox1 = screen.getByDisplayValue('1');
      const checkbox2 = screen.getByDisplayValue('2');

      userEvent.click(checkbox1);
      userEvent.click(checkbox2);

      const menuButton = screen.getByRole('button', { name: /open actions for training reports/i });
      fireEvent.click(menuButton);

      const exportSelectedButton = screen.getByText('Export selected rows');
      fireEvent.click(exportSelectedButton);

      await waitFor(() => {
        expect(getSessionReportsCSVById).toHaveBeenCalledWith(
          ['1', '2'],
          defaultProps.sortConfig,
          defaultProps.filters,
        );
      });
    });
  });
});
