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
        userId: 11,
        user: { name: 'Jane Doe', email: 'jane@example.com' },
        pageId: 'qa-dashboard',
        surveyType: 'thumbs',
        rating: 10,
        thumbs: 'up',
        comment: 'Great',
        createdAt: '2026-03-18T10:00:00.000Z',
        submittedAt: '2026-03-18T12:00:00.000Z',
      },
      {
        id: 2,
        userId: 12,
        user: { name: 'John Doe', email: 'john@example.com' },
        pageId: 'activity-reports',
        surveyType: 'scale',
        rating: 7,
        thumbs: null,
        comment: 'Helpful',
        createdAt: '2026-03-18T10:10:00.000Z',
        submittedAt: '2026-03-18T12:10:00.000Z',
      },
    ]);

    render(<FeedbackSurveys />);

    expect(await screen.findByRole('heading', { name: /feedback survey responses/i })).toBeVisible();
    expect(await screen.findByText('Jane Doe')).toBeVisible();
    expect(screen.getByRole('cell', { name: 'qa-dashboard' })).toBeVisible();
    expect(screen.getByText('Great')).toBeVisible();
    expect(screen.getByText('John Doe')).toBeVisible();
    expect(screen.queryByRole('columnheader', { name: /created at/i })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /feedback by scale/i })).toBeVisible();
    expect(screen.getByRole('heading', { name: /thumbs up and down by month/i })).toBeVisible();

    // Thumbs surveys should not render a scale value.
    const thumbsRow = screen.getByRole('cell', { name: 'qa-dashboard' }).closest('tr');
    expect(thumbsRow).toHaveTextContent('--');

    // Scale surveys should not render a thumbs value.
    const scaleRow = screen.getByRole('cell', { name: 'activity-reports' }).closest('tr');
    expect(scaleRow).toHaveTextContent('7');
  });

  it('applies filters and requests filtered data', async () => {
    fetchMock.get('/api/admin/feedback-surveys?sortBy=submittedAt&sortDir=desc&limit=500', [
      {
        id: 4,
        userId: 22,
        user: { name: 'Filter User', email: 'filter@example.com' },
        pageId: 'qa-dashboard',
        surveyType: 'thumbs',
        rating: 10,
        thumbs: 'up',
        comment: 'Filter row',
        createdAt: '2026-03-18T10:00:00.000Z',
        submittedAt: '2026-03-18T12:00:00.000Z',
      },
    ]);
    fetchMock.get('begin:/api/admin/feedback-surveys?pageId=', []);

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
        userId: 31,
        user: { name: 'Sort User', email: 'sort@example.com' },
        pageId: 'sort-page',
        surveyType: 'scale',
        rating: 6,
        thumbs: null,
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

  it('shows no scale chart message when filtered results have no scale responses', async () => {
    fetchMock.get('/api/admin/feedback-surveys?sortBy=submittedAt&sortDir=desc&limit=500', [
      {
        id: 11,
        userId: 91,
        user: { name: 'Tester', email: 'tester@example.com' },
        pageId: 'page-one',
        surveyType: 'thumbs',
        rating: 10,
        thumbs: 'up',
        comment: 'Looks good',
        createdAt: '2026-03-18T10:00:00.000Z',
        submittedAt: '2026-03-18T12:00:00.000Z',
      },
    ]);

    render(<FeedbackSurveys />);

    expect(await screen.findByText(/no scale feedback responses for the selected filters/i)).toBeVisible();
    expect(screen.queryByText(/no thumbs feedback responses for the selected filters/i)).not.toBeInTheDocument();
  });

  it('shows no thumbs chart message when filtered results have no thumbs responses', async () => {
    fetchMock.get('/api/admin/feedback-surveys?sortBy=submittedAt&sortDir=desc&limit=500', [
      {
        id: 12,
        userId: 92,
        user: { name: 'Scale User', email: 'scale@example.com' },
        pageId: 'page-two',
        surveyType: 'scale',
        rating: 6,
        thumbs: null,
        comment: 'Okay',
        createdAt: '2026-03-18T10:10:00.000Z',
        submittedAt: '2026-03-18T12:10:00.000Z',
      },
    ]);

    render(<FeedbackSurveys />);

    expect(await screen.findByText(/no thumbs feedback responses for the selected filters/i)).toBeVisible();
    expect(screen.queryByText(/no scale feedback responses for the selected filters/i)).not.toBeInTheDocument();
  });

  it('renders export button and prints report with applied filters summary', async () => {
    fetchMock.get('/api/admin/feedback-surveys?sortBy=submittedAt&sortDir=desc&limit=500', [
      {
        id: 8,
        userId: 101,
        user: { name: 'Print User', email: 'print@example.com' },
        pageId: 'recipient-record',
        surveyType: 'thumbs',
        rating: 10,
        thumbs: 'down',
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
        userId: 44,
        user: { name: 'Sort Person', email: 'sort-person@example.com' },
        pageId: 'alpha-page',
        surveyType: 'scale',
        rating: 8,
        thumbs: null,
        comment: 'Sorting row',
        createdAt: '2026-03-18T10:10:00.000Z',
        submittedAt: '2026-03-18T12:10:00.000Z',
      },
    ];

    fetchMock.get('/api/admin/feedback-surveys?sortBy=submittedAt&sortDir=desc&limit=500', rows);
    fetchMock.get('begin:/api/admin/feedback-surveys?', rows);

    render(<FeedbackSurveys />);

    const submittedButton = await screen.findByRole('button', { name: /submitted/i });
    const pageIdButton = screen.getByRole('button', { name: /page id/i });
    const surveyTypeButton = screen.getByRole('button', { name: /survey type/i });
    const ratingButton = screen.getByRole('button', { name: /rating/i });

    await userEvent.click(pageIdButton);
    await waitFor(() => {
      expect(fetchMock.called('/api/admin/feedback-surveys?sortBy=pageId&sortDir=asc&limit=500')).toBe(true);
    });

    await userEvent.click(surveyTypeButton);
    await waitFor(() => {
      expect(fetchMock.called('/api/admin/feedback-surveys?sortBy=surveyType&sortDir=asc&limit=500')).toBe(true);
    });

    await userEvent.click(ratingButton);
    await waitFor(() => {
      expect(fetchMock.called('/api/admin/feedback-surveys?sortBy=rating&sortDir=asc&limit=500')).toBe(true);
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
        userId: 55,
        user: { name: 'Reset User', email: 'reset@example.com' },
        pageId: 'reset-page',
        surveyType: 'thumbs',
        rating: 10,
        thumbs: 'up',
        comment: 'Reset me',
        createdAt: '2026-03-18T10:00:00.000Z',
        submittedAt: '2026-03-18T12:00:00.000Z',
      },
    ]);
    fetchMock.get('begin:/api/admin/feedback-surveys?', []);

    render(<FeedbackSurveys />);

    const searchInput = await screen.findByLabelText(/^search$/i);
    const pageIdSelect = screen.getByLabelText(/^page id$/i);
    const surveyTypeSelect = screen.getByLabelText(/^survey type$/i);
    const thumbsSelect = screen.getByLabelText(/^thumbs$/i);
    const fromDate = screen.getByLabelText(/created at \(from\)/i);
    const toDate = screen.getByLabelText(/created at \(to\)/i);

    await userEvent.type(searchInput, 'feedback');
    await userEvent.selectOptions(pageIdSelect, 'reset-page');
    await userEvent.selectOptions(surveyTypeSelect, 'thumbs');
    await userEvent.selectOptions(thumbsSelect, 'up');
    await userEvent.type(fromDate, '2026-03-01');
    await userEvent.type(toDate, '2026-03-31');
    await userEvent.click(screen.getByRole('button', { name: /submitted/i }));

    await userEvent.click(screen.getByRole('button', { name: /reset filters/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/^search$/i)).toHaveValue('');
      expect(screen.getByLabelText(/^page id$/i)).toHaveValue('');
      expect(screen.getByLabelText(/^survey type$/i)).toHaveValue('');
      expect(screen.getByLabelText(/^thumbs$/i)).toHaveValue('');
      expect(screen.getByLabelText(/created at \(from\)/i)).toHaveValue('');
      expect(screen.getByLabelText(/created at \(to\)/i)).toHaveValue('');
      expect(fetchMock.called('/api/admin/feedback-surveys?sortBy=submittedAt&sortDir=desc&limit=500')).toBe(true);
    });
  });

  it('exports CSV with fallback values and escaped content', async () => {
    const csvRows = [
      {
        id: 41,
        userId: 777,
        user: null,
        pageId: '',
        surveyType: 'thumbs',
        rating: null,
        thumbs: null,
        comment: '',
        createdAt: '2026-03-18T10:00:00.000Z',
        submittedAt: null,
      },
      {
        id: 42,
        userId: 778,
        user: { email: 'fallback@example.com' },
        pageId: 'quoted-page',
        surveyType: 'scale',
        rating: 9,
        thumbs: null,
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
    expect(await screen.findByRole('cell', { name: 'User #777' })).toBeVisible();
    expect(screen.getByRole('cell', { name: 'fallback@example.com' })).toBeVisible();

    await userEvent.click(screen.getByRole('button', { name: /export table/i }));

    expect(createObjectURLSpy).toHaveBeenCalled();

    expect(revokeObjectURLSpy).toHaveBeenCalled();
    window.URL.createObjectURL = originalCreateObjectURL;
    window.URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it('handles invalid chart rows and large thumbs counts', async () => {
    const thumbsRows = Array.from({ length: 14 }, (_, index) => ({
      id: 500 + index,
      userId: 900 + index,
      user: { name: `Thumb User ${index}`, email: `thumb${index}@example.com` },
      pageId: 'thumb-page',
      surveyType: 'thumbs',
      rating: 10,
      thumbs: 'up',
      comment: '',
      createdAt: '2026-03-01T10:00:00.000Z',
      submittedAt: '2026-03-05T12:00:00.000Z',
    }));

    fetchMock.get('/api/admin/feedback-surveys?sortBy=submittedAt&sortDir=desc&limit=500', [
      {
        id: 61,
        userId: 301,
        user: {},
        pageId: 'fallback-user-page',
        surveyType: 'thumbs',
        rating: 10,
        thumbs: null,
        comment: '',
        createdAt: '2026-03-08T10:00:00.000Z',
        submittedAt: '2026-03-08T12:00:00.000Z',
      },
      {
        id: 62,
        userId: 302,
        user: { name: 'Invalid Scale', email: 'invalid-scale@example.com' },
        pageId: 'invalid-scale',
        surveyType: 'scale',
        rating: 'not-a-number',
        thumbs: null,
        comment: 'invalid scale rating',
        createdAt: '2026-03-09T10:00:00.000Z',
        submittedAt: '2026-03-09T12:00:00.000Z',
      },
      {
        id: 63,
        userId: 303,
        user: { name: 'Invalid Date', email: 'invalid-date@example.com' },
        pageId: 'invalid-date',
        surveyType: 'thumbs',
        rating: 1,
        thumbs: 'down',
        comment: 'bad date',
        createdAt: 'invalid-date',
        submittedAt: null,
      },
      ...thumbsRows,
    ]);

    render(<FeedbackSurveys />);

    expect(await screen.findByRole('button', { name: /save screenshot/i })).toBeVisible();
    const fallbackUserCell = await screen.findByRole('cell', { name: 'User #301' });
    const fallbackRow = fallbackUserCell.closest('tr');
    expect(fallbackRow).toHaveTextContent('--');
  });
});
