import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FeedbackSurvey from '../FeedbackSurvey';

describe('FeedbackSurvey', () => {
  const defaultProps = {
    pageId: 'test-dashboard',
    onSubmit: jest.fn(),
  };

  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('renders the lower-right trigger button', () => {
    const { pageId, onSubmit } = defaultProps;
    render(<FeedbackSurvey pageId={pageId} onSubmit={onSubmit} />);

    expect(screen.getByRole('button', { name: /was this page helpful\?/i })).toBeInTheDocument();
  });

  it('opens the modal with expected copy', async () => {
    const { pageId, onSubmit } = defaultProps;
    render(<FeedbackSurvey pageId={pageId} onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole('button', { name: /was this page helpful\?/i }));

    expect(await screen.findByRole('heading', { name: /how did we do\?/i })).toBeInTheDocument();
    expect(screen.getByText(/select "yes" or "no\./i)).toBeInTheDocument();
    expect(screen.getByLabelText(/did you find this page helpful\?/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/optional comments/i)).toBeInTheDocument();
    expect(screen.getByText(/140 characters remaining/i)).toBeInTheDocument();
  });

  it('disables submit until yes or no is selected', async () => {
    const { pageId, onSubmit } = defaultProps;
    render(<FeedbackSurvey pageId={pageId} onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole('button', { name: /was this page helpful\?/i }));

    expect(screen.getByRole('button', { name: /^submit$/i })).toBeDisabled();

    await userEvent.click(screen.getByRole('radio', { name: /yes/i }));
    expect(screen.getByRole('button', { name: /^submit$/i })).not.toBeDisabled();
  });

  it('submits yes response with yes/no payload', async () => {
    const mockOnSubmit = jest.fn().mockResolvedValue(undefined);
    render(
      <FeedbackSurvey
        pageId="test-dashboard"
        onSubmit={mockOnSubmit}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /was this page helpful\?/i }));
    await userEvent.click(await screen.findByRole('radio', { name: /yes/i }));
    await userEvent.click(screen.getByRole('button', { name: /^submit$/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          pageId: 'test-dashboard',
          rating: 10,
          thumbs: 'yes',
          comment: '',
          timestamp: expect.any(String),
        }),
      );
    });
  });

  it('submits no response with yes/no payload and trimmed comments', async () => {
    const mockOnSubmit = jest.fn().mockResolvedValue(undefined);
    render(
      <FeedbackSurvey
        pageId="test-dashboard"
        onSubmit={mockOnSubmit}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /was this page helpful\?/i }));
    await userEvent.click(await screen.findByRole('radio', { name: /no/i }));
    await userEvent.type(screen.getByLabelText(/optional comments/i), '  Needs more examples  ');
    await userEvent.click(screen.getByRole('button', { name: /^submit$/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          rating: 1,
          thumbs: 'no',
          comment: 'Needs more examples',
        }),
      );
    });
  });

  it('updates remaining comment characters while typing', async () => {
    const { pageId, onSubmit } = defaultProps;
    render(<FeedbackSurvey pageId={pageId} onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole('button', { name: /was this page helpful\?/i }));
    const textarea = await screen.findByLabelText(/optional comments/i);

    await userEvent.type(textarea, 'abc');

    expect(screen.getByText(/137 characters remaining/i)).toBeInTheDocument();
  });

  it('limits comment length to 140 characters', async () => {
    const { pageId, onSubmit } = defaultProps;
    render(<FeedbackSurvey pageId={pageId} onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole('button', { name: /was this page helpful\?/i }));
    const textarea = await screen.findByLabelText(/optional comments/i);

    await userEvent.type(textarea, 'a'.repeat(180));

    expect(textarea.value).toHaveLength(140);
  });

  it('does not render when the survey is already completed', () => {
    localStorage.setItem('survey-feedback-dismissed-test-dashboard', 'completed');

    render(
      <FeedbackSurvey
        pageId="test-dashboard"
        onSubmit={jest.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: /was this page helpful\?/i })).not.toBeInTheDocument();
  });

  it('hides trigger after successful submission', async () => {
    const mockOnSubmit = jest.fn().mockResolvedValue(undefined);

    render(
      <FeedbackSurvey
        pageId="test-dashboard"
        onSubmit={mockOnSubmit}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /was this page helpful\?/i }));
    await userEvent.click(await screen.findByRole('radio', { name: /yes/i }));
    await userEvent.click(screen.getByRole('button', { name: /^submit$/i }));

    await waitFor(() => {
      expect(localStorage.getItem('survey-feedback-dismissed-test-dashboard')).toBe('completed');
      expect(screen.queryByRole('button', { name: /was this page helpful\?/i })).not.toBeInTheDocument();
    });
  });

  it('handles submission errors and keeps survey available', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const mockOnSubmit = jest.fn().mockRejectedValue(new Error('Network error'));

    render(
      <FeedbackSurvey
        pageId="test-dashboard"
        onSubmit={mockOnSubmit}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /was this page helpful\?/i }));
    await userEvent.click(await screen.findByRole('radio', { name: /yes/i }));
    await userEvent.click(screen.getByRole('button', { name: /^submit$/i }));

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(screen.getByRole('button', { name: /was this page helpful\?/i, hidden: true })).toBeInTheDocument();
    });

    consoleErrorSpy.mockRestore();
  });
});
