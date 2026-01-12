/* eslint-disable react/jsx-props-no-spreading */
/* eslint-disable max-len */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import TrainingReportsTable from '../index';
import * as sessionReportsFetcher from '../../../fetchers/sessionReports';

jest.mock('../../../fetchers/sessionReports');
jest.mock('../../../hooks/useSessionSort');

const mockUseSessionSort = require('../../../hooks/useSessionSort').default;

const mockReports = [
  {
    id: 1,
    eventId: 'EVT001',
    eventName: 'Event 1',
    sessionName: 'Session 1',
    startDate: '2024-01-01',
    endDate: '2024-01-02',
    objectiveTopics: [{ name: 'Topic 1' }],
  },
  {
    id: 2,
    eventId: 'EVT002',
    eventName: 'Event 2',
    sessionName: 'Session 2',
    startDate: '2024-01-03',
    endDate: '2024-01-04',
    objectiveTopics: [{ name: 'Topic 2' }],
  },
];

const defaultProps = {
  filters: [],
  tableCaption: 'Training Reports',
  exportIdPrefix: 'tr-rd-',
  resetPagination: false,
  setResetPagination: jest.fn(),
};

describe('TrainingReportsTable', () => {
  beforeEach(() => {
    mockUseSessionSort.mockReturnValue([
      { sortBy: 'id', direction: 'desc', activePage: 1 },
      jest.fn(),
    ]);
    sessionReportsFetcher.getSessionReports.mockResolvedValue({
      count: 2,
      rows: mockReports,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders table with caption', async () => {
    render(
      <BrowserRouter>
        <TrainingReportsTable {...defaultProps} />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Training Reports')).toBeInTheDocument();
    });
  });

  it('fetches reports on mount', async () => {
    render(
      <BrowserRouter>
        <TrainingReportsTable {...defaultProps} />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(sessionReportsFetcher.getSessionReports).toHaveBeenCalled();
    });
  });

  it('displays error message when fetch fails', async () => {
    sessionReportsFetcher.getSessionReports.mockRejectedValueOnce(new Error('Network error'));

    render(
      <BrowserRouter>
        <TrainingReportsTable {...defaultProps} />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Unable to fetch reports')).toBeInTheDocument();
    });
  });

  it('handles pagination reset', async () => {
    const setResetPagination = jest.fn();
    const { rerender } = render(
      <BrowserRouter>
        <TrainingReportsTable {...defaultProps} resetPagination={false} setResetPagination={setResetPagination} />
      </BrowserRouter>,
    );

    rerender(
      <BrowserRouter>
        <TrainingReportsTable {...defaultProps} resetPagination setResetPagination={setResetPagination} />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(setResetPagination).toHaveBeenCalledWith(false);
    });
  });

  it('refetches when filters change', async () => {
    const { rerender } = render(
      <BrowserRouter>
        <TrainingReportsTable {...defaultProps} filters={[]} />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(sessionReportsFetcher.getSessionReports).toHaveBeenCalledTimes(1);
    });

    const newFilters = [{ id: 'region', query: '1', condition: 'is' }];
    rerender(
      <BrowserRouter>
        <TrainingReportsTable {...defaultProps} filters={newFilters} />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(sessionReportsFetcher.getSessionReports).toHaveBeenCalledTimes(2);
    });
  });
});
