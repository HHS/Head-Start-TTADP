import '@testing-library/jest-dom';
import React from 'react';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import fetchMock from 'fetch-mock';
import FeedbackSurveys from '../FeedbackSurveys';

describe('FeedbackSurveys', () => {
  afterEach(() => fetchMock.restore());

  it('renders returned feedback survey rows', async () => {
    fetchMock.get('/api/admin/feedback-surveys?sortBy=submittedAt&sortDir=desc&limit=500', [
      {
        id: 1,
        regionId: 1,
        userRoles: ['Grants Specialist'],
        pageId: 'qa-dashboard',
        response: 'yes',
        comment: 'Great',
        createdAt: '2026-03-18T10:00:00.000Z',
        submittedAt: '2026-03-18T12:00:00.000Z',
      },
      {
        id: 2,
        regionId: 2,
        userRoles: ['Program Specialist'],
        pageId: 'activity-reports',
        response: 'no',
        comment: 'Helpful',
        createdAt: '2026-03-18T10:10:00.000Z',
        submittedAt: '2026-03-18T12:10:00.000Z',
      },
    ]);

    render(<FeedbackSurveys />);

    expect(await screen.findByRole('heading', { name: /feedback survey responses/i })).toBeVisible();
    expect(await screen.findByText('Region 1')).toBeVisible();
    expect(screen.getByRole('cell', { name: 'qa-dashboard' })).toBeVisible();
    expect(screen.getByText('Great')).toBeVisible();
    expect(screen.getByText('Program Specialist')).toBeVisible();
    expect(screen.queryByRole('columnheader', { name: /created at/i })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /yes and no responses$/i })).toBeVisible();
    expect(screen.getByRole('heading', { name: /yes and no responses by month/i })).toBeVisible();

    const yesRow = screen.getByRole('cell', { name: 'qa-dashboard' }).closest('tr');
    expect(yesRow).toHaveTextContent('Yes');

    const noRow = screen.getByRole('cell', { name: 'activity-reports' }).closest('tr');
    expect(noRow).toHaveTextContent('No');
  });

  it('applies filters and requests filtered data', async () => {
    fetchMock.get('/api/admin/feedback-surveys?sortBy=submittedAt&sortDir=desc&limit=500', [
      {
        id: 4,
        regionId: 4,
        userRoles: ['Grants Specialist'],
        pageId: 'qa-dashboard',
        response: 'yes',
        comment: 'Filter row',
        createdAt: '2026-03-18T10:00:00.000Z',
        submittedAt: '2026-03-18T12:00:00.000Z',
      },
    ]);
    fetchMock.get('begin:/api/admin/feedback-surveys?pageId=', []);
    fetchMock.get('begin:/api/admin/feedback-surveys?response=', []);

    render(<FeedbackSurveys />);

    const pageIdInput = await screen.findByLabelText(/page id/i);
    await userEvent.selectOptions(pageIdInput, 'qa-dashboard');

    await waitFor(() => {
      expect(fetchMock.called('/api/admin/feedback-surveys?pageId=qa-dashboard&sortBy=submittedAt&sortDir=desc&limit=500')).toBe(true);
    });
  });

  it('applies created at date filters', async () => {
    fetchMock.get('/api/admin/feedback-surveys?sortBy=submittedAt&sortDir=desc&limit=500', []);
    fetchMock.get('begin:/api/admin/feedback-surveys?createdAtFrom=', []);

    render(<FeedbackSurveys />);

    const createdAtFromInput = await screen.findByLabelText(/created at \(from\)/i);
    await userEvent.type(createdAtFromInput, '2026-03-01');

    await waitFor(() => {
      expect(fetchMock.called('/api/admin/feedback-surveys?createdAtFrom=2026-03-01&sortBy=submittedAt&sortDir=desc&limit=500')).toBe(true);
    });
  });

  it('sorts by submitted when the column header is clicked', async () => {
    fetchMock.get('/api/admin/feedback-surveys?sortBy=submittedAt&sortDir=desc&limit=500', [
      {
        id: 9,
        regionId: 1,
        userRoles: ['Program Specialist'],
        pageId: 'sort-page',
        response: 'yes',
        comment: 'Sort row',
        createdAt: '2026-03-18T10:00:00.000Z',
        submittedAt: '2026-03-18T12:00:00.000Z',
      },
    ]);
    fetchMock.get('begin:/api/admin/feedback-surveys?sortBy=submittedAt', []);

    render(<FeedbackSurveys />);

    const submittedSortButton = await screen.findByRole('button', { name: /submitted/i });
    await userEvent.click(submittedSortButton);

    await waitFor(() => {
      expect(fetchMock.called('/api/admin/feedback-surveys?sortBy=submittedAt&sortDir=asc&limit=500')).toBe(true);
    });
  });

  it('does not show empty-state chart message when yes/no responses exist', async () => {
    fetchMock.get('/api/admin/feedback-surveys?sortBy=submittedAt&sortDir=desc&limit=500', [
      {
        id: 11,
        regionId: 9,
        userRoles: ['Tester Role'],
        pageId: 'page-one',
        response: 'yes',
        comment: 'Looks good',
        createdAt: '2026-03-18T10:00:00.000Z',
        submittedAt: '2026-03-18T12:00:00.000Z',
      },
    ]);

    render(<FeedbackSurveys />);

    expect(screen.queryByText(/no yes\/no feedback responses for the selected filters/i)).not.toBeInTheDocument();
  });

  it('shows empty results message when filtered results are empty', async () => {
    fetchMock.get('/api/admin/feedback-surveys?sortBy=submittedAt&sortDir=desc&limit=500', []);

    render(<FeedbackSurveys />);

    expect(await screen.findByText(/no feedback survey responses matched your filters/i)).toBeVisible();
  });

  it('renders export button and prints report with applied filters summary', async () => {
    fetchMock.get('/api/admin/feedback-surveys?sortBy=submittedAt&sortDir=desc&limit=500', [
      {
        id: 8,
        regionId: 8,
        userRoles: ['Print Role'],
        pageId: 'recipient-record',
        response: 'no',
        comment: 'Needs work',
        createdAt: '2026-03-18T10:00:00.000Z',
        submittedAt: '2026-03-18T12:00:00.000Z',
      },
    ]);

    const printSpy = jest.spyOn(window, 'print').mockImplementation(() => {});
    const originalCreateObjectURL = window.URL.createObjectURL;
    const originalRevokeObjectURL = window.URL.revokeObjectURL;
    const createObjectURLSpy = jest.fn(() => 'blob:feedback-survey-export');
    const revokeObjectURLSpy = jest.fn();
    window.URL.createObjectURL = createObjectURLSpy;
    window.URL.revokeObjectURL = revokeObjectURLSpy;

    render(<FeedbackSurveys />);

    const appliedFiltersSection = await screen.findByRole('region', {
      name: /applied filters for exported feedback survey report/i,
    });
    const withinAppliedFilters = within(appliedFiltersSection);

    expect(withinAppliedFilters.getByRole('heading', { name: /applied filters/i })).toBeVisible();
    expect(withinAppliedFilters.getByText('Sort by')).toBeVisible();
    expect(withinAppliedFilters.getByText('submittedAt')).toBeVisible();
    expect(withinAppliedFilters.getByText('Result count')).toBeVisible();
    expect(withinAppliedFilters.getByText('1')).toBeVisible();

    const printButton = screen.getByRole('button', { name: /print to pdf/i });
    fireEvent.click(printButton);

    expect(printSpy).toHaveBeenCalled();

    const exportButton = screen.getByRole('button', { name: /export table/i });
    fireEvent.click(exportButton);

    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalled();

    printSpy.mockRestore();
    window.URL.createObjectURL = originalCreateObjectURL;
    window.URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it('shows an error alert when fetching responses fails', async () => {
    fetchMock.get('/api/admin/feedback-surveys?sortBy=submittedAt&sortDir=desc&limit=500', 500);

    render(<FeedbackSurveys />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /there was an error fetching feedback survey responses/i,
    );
    expect(screen.queryByText(/loading feedback survey responses/i)).not.toBeInTheDocument();
  });

  it('supports sorting across all sortable columns and toggles submitted sort direction', async () => {
    const rows = [
      {
        id: 21,
        regionId: 3,
        userRoles: ['Sort Role'],
        pageId: 'alpha-page',
        response: 'yes',
        comment: 'Sorting row',
        createdAt: '2026-03-18T10:10:00.000Z',
        submittedAt: '2026-03-18T12:10:00.000Z',
      },
    ];

    fetchMock.get('/api/admin/feedback-surveys?sortBy=submittedAt&sortDir=desc&limit=500', rows);
    fetchMock.get('begin:/api/admin/feedback-surveys?', rows);

    render(<FeedbackSurveys />);

    const submittedButton = await screen.findByRole('button', { name: /submitted/i });
    const regionIdButton = screen.getByRole('button', { name: /region id/i });
    const pageIdButton = screen.getByRole('button', { name: /page id/i });
    const responseButton = screen.getByRole('button', { name: /was this page helpful\?/i });

    await userEvent.click(regionIdButton);
    await waitFor(() => {
      expect(fetchMock.called('/api/admin/feedback-surveys?sortBy=regionId&sortDir=asc&limit=500')).toBe(true);
    });

    await userEvent.click(pageIdButton);
    await waitFor(() => {
      expect(fetchMock.called('/api/admin/feedback-surveys?sortBy=pageId&sortDir=asc&limit=500')).toBe(true);
    });

    await userEvent.click(responseButton);
    await waitFor(() => {
      expect(fetchMock.called('/api/admin/feedback-surveys?sortBy=response&sortDir=asc&limit=500')).toBe(true);
    });

    await userEvent.click(submittedButton);
    await waitFor(() => {
      expect(fetchMock.called('/api/admin/feedback-surveys?sortBy=submittedAt&sortDir=asc&limit=500')).toBe(true);
    });

    await userEvent.click(submittedButton);
    await waitFor(() => {
      expect(fetchMock.called('/api/admin/feedback-surveys?sortBy=submittedAt&sortDir=desc&limit=500')).toBe(true);
    });
  });

  it('resets filters and sort to defaults', async () => {
    fetchMock.get('/api/admin/feedback-surveys?sortBy=submittedAt&sortDir=desc&limit=500', [
      {
        id: 31,
        regionId: 6,
        userRoles: ['Reset Role'],
        pageId: 'reset-page',
        response: 'yes',
        comment: 'Reset me',
        createdAt: '2026-03-18T10:00:00.000Z',
        submittedAt: '2026-03-18T12:00:00.000Z',
      },
    ]);
    fetchMock.get('begin:/api/admin/feedback-surveys?', []);

    render(<FeedbackSurveys />);

    const searchInput = await screen.findByLabelText(/^search$/i);
    const pageIdSelect = screen.getByLabelText(/^page id$/i);
    const responseSelect = screen.getByLabelText(/^was this page helpful\?$/i);
    const fromDate = screen.getByLabelText(/created at \(from\)/i);
    const toDate = screen.getByLabelText(/created at \(to\)/i);

    await userEvent.type(searchInput, 'feedback');
    await userEvent.selectOptions(pageIdSelect, 'reset-page');
    await userEvent.selectOptions(responseSelect, 'yes');
    await userEvent.type(fromDate, '2026-03-01');
    await userEvent.type(toDate, '2026-03-31');
    await userEvent.click(screen.getByRole('button', { name: /submitted/i }));

    await userEvent.click(screen.getByRole('button', { name: /reset filters/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/^search$/i)).toHaveValue('');
      expect(screen.getByLabelText(/^page id$/i)).toHaveValue('');
      expect(screen.getByLabelText(/^was this page helpful\?$/i)).toHaveValue('');
      expect(screen.getByLabelText(/created at \(from\)/i)).toHaveValue('');
      expect(screen.getByLabelText(/created at \(to\)/i)).toHaveValue('');
      expect(fetchMock.called('/api/admin/feedback-surveys?sortBy=submittedAt&sortDir=desc&limit=500')).toBe(true);
    });
  });

  it('exports CSV with fallback values and escaped content', async () => {
    const csvRows = [
      {
        id: 41,
        regionId: null,
        userRoles: [],
        pageId: '',
        response: null,
        comment: '',
        createdAt: '2026-03-18T10:00:00.000Z',
        submittedAt: null,
      },
      {
        id: 42,
        regionId: 12,
        userRoles: ['Role A', 'Role B'],
        pageId: 'quoted-page',
        response: 'yes',
        comment: 'Line with "quotes"',
        createdAt: '2026-03-18T10:00:00.000Z',
        submittedAt: 'invalid-date',
      },
    ];

    fetchMock.get('/api/admin/feedback-surveys?sortBy=submittedAt&sortDir=desc&limit=500', csvRows);

    const originalCreateObjectURL = window.URL.createObjectURL;
    const originalRevokeObjectURL = window.URL.revokeObjectURL;
    const createObjectURLSpy = jest.fn(() => 'blob:csv');
    const revokeObjectURLSpy = jest.fn();
    window.URL.createObjectURL = createObjectURLSpy;
    window.URL.revokeObjectURL = revokeObjectURLSpy;

    render(<FeedbackSurveys />);

    await screen.findByRole('heading', { name: /feedback survey responses/i });
    const fallbackCells = await screen.findAllByRole('cell', { name: '--' });
    expect(fallbackCells.length).toBeGreaterThan(0);
    expect(screen.getByRole('cell', { name: 'Role A, Role B' })).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: /export table/i }));

    expect(createObjectURLSpy).toHaveBeenCalled();

    expect(revokeObjectURLSpy).toHaveBeenCalled();
    window.URL.createObjectURL = originalCreateObjectURL;
    window.URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it('handles invalid chart rows and large yes/no counts', async () => {
    const manyRows = Array.from({ length: 14 }, (_, index) => ({
      id: 500 + index,
      regionId: 10,
      userRoles: ['Feedback Role'],
      pageId: 'feedback-page',
      response: 'yes',
      comment: '',
      createdAt: '2026-03-01T10:00:00.000Z',
      submittedAt: '2026-03-05T12:00:00.000Z',
    }));

    fetchMock.get('/api/admin/feedback-surveys?sortBy=submittedAt&sortDir=desc&limit=500', [
      {
        id: 61,
        regionId: null,
        userRoles: [],
        pageId: 'fallback-user-page',
        response: null,
        comment: '',
        createdAt: '2026-03-08T10:00:00.000Z',
        submittedAt: '2026-03-08T12:00:00.000Z',
      },
      {
        id: 62,
        regionId: 11,
        userRoles: ['Invalid Response Role'],
        pageId: 'invalid-scale',
        response: null,
        comment: 'invalid response',
        createdAt: '2026-03-09T10:00:00.000Z',
        submittedAt: '2026-03-09T12:00:00.000Z',
      },
      {
        id: 63,
        regionId: 12,
        userRoles: ['Invalid Date Role'],
        pageId: 'invalid-date',
        response: 'no',
        comment: 'bad date',
        createdAt: 'invalid-date',
        submittedAt: null,
      },
      ...manyRows,
    ]);

    render(<FeedbackSurveys />);

    expect(await screen.findByRole('heading', { name: /yes and no responses$/i })).toBeVisible();
    const regionCells = await screen.findAllByRole('cell', { name: 'Region 10' });
    expect(regionCells.length).toBeGreaterThan(0);
  });
});
