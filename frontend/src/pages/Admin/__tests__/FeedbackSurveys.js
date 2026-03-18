import '@testing-library/jest-dom';
import React from 'react';
import {
  render,
  screen,
  waitFor,
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
        submittedAt: '2026-03-18T12:10:00.000Z',
      },
    ]);

    render(<FeedbackSurveys />);

    expect(await screen.findByRole('heading', { name: /feedback survey responses/i })).toBeVisible();
    expect(await screen.findByText('Jane Doe')).toBeVisible();
    expect(screen.getByText('qa-dashboard')).toBeVisible();
    expect(screen.getByText('Great')).toBeVisible();
    expect(screen.getByText('John Doe')).toBeVisible();

    // Thumbs surveys should not render a scale value.
    const thumbsRow = screen.getByText('qa-dashboard').closest('tr');
    expect(thumbsRow).toHaveTextContent('--');

    // Scale surveys should not render a thumbs value.
    const scaleRow = screen.getByText('activity-reports').closest('tr');
    expect(scaleRow).toHaveTextContent('7');
  });

  it('applies filters and requests filtered data', async () => {
    fetchMock.get('/api/admin/feedback-surveys?sortBy=submittedAt&sortDir=desc&limit=500', []);
    fetchMock.get('begin:/api/admin/feedback-surveys?pageId=', []);

    render(<FeedbackSurveys />);

    const pageIdInput = await screen.findByLabelText(/page id/i);
    await userEvent.type(pageIdInput, 'qa');

    await waitFor(() => {
      expect(fetchMock.called('/api/admin/feedback-surveys?pageId=qa&sortBy=submittedAt&sortDir=desc&limit=500')).toBe(true);
    });
  });
});
