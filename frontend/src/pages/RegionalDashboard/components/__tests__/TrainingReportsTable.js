import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import React from 'react';
import { Router } from 'react-router';
import { getSessionReportsCSV, getSessionReportsCSVById } from '../../../../fetchers/session';
import TrainingReportsTable from '../TrainingReportsTable';

jest.mock('../../../../fetchers/session');

const baseRow = {
  id: 1,
  eventId: 'R01-TR-1001',
  eventName: 'Sample training event',
  sessionName: 'Session A',
  startDate: '2026-01-05',
  endDate: '2026-01-06',
  objectiveTopics: ['Coaching'],
  goalTemplates: [{ id: 1, standard: 'FEI' }],
};

const defaultSortConfig = {
  sortBy: 'Event_ID',
  direction: 'desc',
  activePage: 1,
  offset: 0,
};

const renderTable = (overrideProps = {}) => {
  const history = createMemoryHistory();
  const setSortConfig = jest.fn();
  const requestSort = jest.fn();

  render(
    <Router history={history}>
      <TrainingReportsTable
        data={{ rows: [baseRow], count: 1 }}
        title="Training Reports"
        requestSort={requestSort}
        sortConfig={defaultSortConfig}
        setSortConfig={setSortConfig}
        {...overrideProps}
      />
    </Router>
  );

  return { history, setSortConfig, requestSort };
};

describe('TrainingReportsTable', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows the empty message when there are no rows', () => {
    renderTable({ data: { rows: [], count: 0 }, emptyMsg: 'No training reports found' });
    expect(screen.getByText('No training reports found')).toBeInTheDocument();
  });

  it('shows the title and subtitle', () => {
    renderTable();
    expect(screen.getByText('Training Reports')).toBeInTheDocument();
    expect(screen.getByText('Approved sessions from training events.')).toBeInTheDocument();
  });

  it('renders session data for each row', () => {
    renderTable();
    expect(screen.getByRole('link', { name: 'R01-TR-1001' })).toHaveAttribute(
      'href',
      '/training-report/view/R01-TR-1001?back_link=hide'
    );
    // TextTrim renders a duplicate hidden element used to measure truncation.
    expect(screen.getAllByText('Sample training event').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Session A').length).toBeGreaterThan(0);
    expect(screen.getByText('01/05/2026')).toBeInTheDocument();
    expect(screen.getByText('01/06/2026')).toBeInTheDocument();
    expect(screen.getAllByText('FEI').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Coaching').length).toBeGreaterThan(0);
  });

  it('navigates to the training report when the row "View" action is used', () => {
    const { history } = renderTable();
    fireEvent.click(screen.getByRole('button', { name: 'Actions for R01-TR-1001' }));
    fireEvent.click(screen.getByRole('button', { name: 'View' }));
    expect(history.location.pathname).toBe('/training-report/view/R01-TR-1001');
    expect(history.location.search).toBe('?back_link=hide');
  });

  it('exports a single row via the row "Export" action', () => {
    renderTable();
    fireEvent.click(screen.getByRole('button', { name: 'Actions for R01-TR-1001' }));
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    expect(getSessionReportsCSVById).toHaveBeenCalledWith([1], defaultSortConfig, [], null);
  });

  it('exports the whole table, forwarding filters and recipientId', () => {
    const filters = [{ topic: 'region', condition: 'is', query: 1 }];
    renderTable({ recipientId: '42', filters });
    fireEvent.click(screen.getByRole('button', { name: 'Open Actions for Training Reports' }));
    fireEvent.click(screen.getByRole('button', { name: 'Export table' }));
    expect(getSessionReportsCSV).toHaveBeenCalledWith(defaultSortConfig, filters, '42');
  });

  it('exports selected rows when a row checkbox is checked', () => {
    renderTable({ recipientId: '42' });
    fireEvent.click(screen.getByLabelText('Select R01-TR-1001'));
    fireEvent.click(screen.getByRole('button', { name: 'Open Actions for Training Reports' }));
    fireEvent.click(screen.getByRole('button', { name: 'Export selected rows' }));
    expect(getSessionReportsCSVById).toHaveBeenCalledWith(['1'], defaultSortConfig, [], '42');
  });

  it('does not show the export menu when there are no rows', () => {
    renderTable({ data: { rows: [], count: 0 } });
    expect(
      screen.queryByRole('button', { name: 'Open Actions for Training Reports' })
    ).not.toBeInTheDocument();
  });
});
