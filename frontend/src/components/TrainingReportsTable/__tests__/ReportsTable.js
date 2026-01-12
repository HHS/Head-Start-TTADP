/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ReportsTable from '../ReportsTable';

const mockReports = [
  {
    id: 1,
    eventId: 'EVT001',
    eventName: 'Event 1',
    sessionName: 'Session 1',
    startDate: '2024-01-01',
    endDate: '2024-01-02',
    objectiveTopics: ['Topic 1'],
  },
  {
    id: 2,
    eventId: 'EVT002',
    eventName: 'Event 2',
    sessionName: 'Session 2',
    startDate: '2024-01-03',
    endDate: '2024-01-04',
    objectiveTopics: ['Topic 2'],
  },
];

const defaultProps = {
  loading: false,
  reports: mockReports,
  sortConfig: { sortBy: 'id', direction: 'desc', activePage: 1 },
  setSortConfig: jest.fn(),
  offset: 0,
  setOffset: jest.fn(),
  tableCaption: 'Training Reports',
  exportIdPrefix: 'tr-rd-',
  reportsCount: 2,
  activePage: 1,
  handleDownloadAllReports: jest.fn(),
  handleDownloadClick: jest.fn(),
};

describe('ReportsTable', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders table with correct columns', () => {
    render(
      <BrowserRouter>
        <ReportsTable {...defaultProps} />
      </BrowserRouter>,
    );

    expect(screen.getByText('Event ID')).toBeInTheDocument();
    expect(screen.getByText('Event title')).toBeInTheDocument();
    expect(screen.getByText('Session name')).toBeInTheDocument();
    expect(screen.getByText('Session start date')).toBeInTheDocument();
    expect(screen.getByText('Session end date')).toBeInTheDocument();
    expect(screen.getByText('Topics')).toBeInTheDocument();
  });

  it('renders all reports', () => {
    render(
      <BrowserRouter>
        <ReportsTable {...defaultProps} />
      </BrowserRouter>,
    );

    expect(screen.getByText('EVT001')).toBeInTheDocument();
    expect(screen.getByText('EVT002')).toBeInTheDocument();
  });

  it('handles select all checkbox', () => {
    render(
      <BrowserRouter>
        <ReportsTable {...defaultProps} />
      </BrowserRouter>,
    );

    const selectAllCheckbox = screen.getByLabelText('Select or de-select all reports');
    selectAllCheckbox.click();

    expect(selectAllCheckbox).toBeChecked();
  });

  it('handles individual report selection', () => {
    render(
      <BrowserRouter>
        <ReportsTable {...defaultProps} />
      </BrowserRouter>,
    );

    const firstReportCheckbox = screen.getByLabelText('Select EVT001');
    firstReportCheckbox.click();

    expect(firstReportCheckbox).toBeChecked();
  });

  it('calls requestSort when column header is clicked', () => {
    const setSortConfig = jest.fn();
    render(
      <BrowserRouter>
        <ReportsTable {...defaultProps} setSortConfig={setSortConfig} />
      </BrowserRouter>,
    );

    const eventIdHeader = screen.getByLabelText(/Event ID/);
    eventIdHeader.click();

    expect(setSortConfig).toHaveBeenCalled();
  });

  it('displays loading state', () => {
    render(
      <BrowserRouter>
        <ReportsTable {...defaultProps} loading />
      </BrowserRouter>,
    );

    expect(screen.getByLabelText('Training reports table loading')).toBeInTheDocument();
  });

  it('renders empty state when no reports', () => {
    render(
      <BrowserRouter>
        <ReportsTable {...defaultProps} reports={[]} />
      </BrowserRouter>,
    );

    expect(screen.getByText('Training Reports')).toBeInTheDocument();
  });

  it('handles sort ascending then descending', () => {
    const setSortConfig = jest.fn();

    render(
      <BrowserRouter>
        <ReportsTable
          {...defaultProps}
          setSortConfig={setSortConfig}
          sortConfig={{ sortBy: 'eventId', direction: 'asc', activePage: 1 }}
        />
      </BrowserRouter>,
    );

    const eventIdHeader = screen.getByLabelText(/Event ID/);
    eventIdHeader.click();

    expect(setSortConfig).toHaveBeenCalledWith({
      sortBy: 'eventId',
      direction: 'desc',
      activePage: 1,
    });
  });
});
