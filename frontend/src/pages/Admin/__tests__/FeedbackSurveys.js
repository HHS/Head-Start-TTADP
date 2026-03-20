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
    fetchMock.get('/api/admin/feedback-surveys?sortBy=createdAt&sortDir=desc&limit=500', [
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
    expect(screen.getByRole('columnheader', { name: /created at/i })).toBeVisible();
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
    fetchMock.get('/api/admin/feedback-surveys?sortBy=createdAt&sortDir=desc&limit=500', [
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
      expect(fetchMock.called('/api/admin/feedback-surveys?pageId=qa-dashboard&sortBy=createdAt&sortDir=desc&limit=500')).toBe(true);
    });
  });

  it('applies created at date filters', async () => {
    fetchMock.get('/api/admin/feedback-surveys?sortBy=createdAt&sortDir=desc&limit=500', []);
    fetchMock.get('begin:/api/admin/feedback-surveys?createdAtFrom=', []);

    render(<FeedbackSurveys />);

    const createdAtFromInput = await screen.findByLabelText(/created at \(from\)/i);
    await userEvent.type(createdAtFromInput, '2026-03-01');

    await waitFor(() => {
      expect(fetchMock.called('/api/admin/feedback-surveys?createdAtFrom=2026-03-01&sortBy=createdAt&sortDir=desc&limit=500')).toBe(true);
    });
  });

  it('sorts by created at when the column header is clicked', async () => {
    fetchMock.get('/api/admin/feedback-surveys?sortBy=createdAt&sortDir=desc&limit=500', [
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
    fetchMock.get('begin:/api/admin/feedback-surveys?sortBy=createdAt', []);

    render(<FeedbackSurveys />);

    const createdAtSortButton = await screen.findByRole('button', { name: /created at/i });
    await userEvent.click(createdAtSortButton);

    await waitFor(() => {
      expect(fetchMock.called('/api/admin/feedback-surveys?sortBy=createdAt&sortDir=asc&limit=500')).toBe(true);
    });
  });

  it('shows no scale chart message when filtered results have no scale responses', async () => {
    fetchMock.get('/api/admin/feedback-surveys?sortBy=createdAt&sortDir=desc&limit=500', [
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
    fetchMock.get('/api/admin/feedback-surveys?sortBy=createdAt&sortDir=desc&limit=500', [
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
    fetchMock.get('/api/admin/feedback-surveys?sortBy=createdAt&sortDir=desc&limit=500', [
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
    expect(withinAppliedFilters.getByText('createdAt')).toBeVisible();
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
});
