import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FeedbackSurvey from '../FeedbackSurvey';
import { getSurveyFeedbackStatus } from '../../fetchers/feedback';

jest.mock('../../fetchers/feedback', () => ({
  getSurveyFeedbackStatus: jest.fn(),
}));

const ALWAYS_SHOW_SURVEY_KEY = 'ttahub:alwaysShowFeedbackSurvey';

describe('FeedbackSurvey', () => {
  const defaultProps = {
    pageId: 'test-dashboard',
    onSubmit: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getSurveyFeedbackStatus.mockResolvedValue(false);
    jest.useRealTimers();
    window.localStorage.removeItem(ALWAYS_SHOW_SURVEY_KEY);
  });

  it('shows the lower-right trigger button after completion check', async () => {
    const { pageId, onSubmit } = defaultProps;
    render(<FeedbackSurvey pageId={pageId} onSubmit={onSubmit} />);

    expect(await screen.findByRole('button', { name: /was this page helpful\?/i })).toBeInTheDocument();
  });

  it('opens the modal with expected copy', async () => {
    const { pageId, onSubmit } = defaultProps;
    render(<FeedbackSurvey pageId={pageId} onSubmit={onSubmit} />);

    await userEvent.click(await screen.findByRole('button', { name: /was this page helpful\?/i }));

    expect(await screen.findByRole('heading', { name: /how did we do\?/i, level: 2 })).toBeInTheDocument();
    expect(screen.getByText(/select "yes" or "no\./i)).toBeInTheDocument();
    expect(screen.getByLabelText(/did you find this page helpful\?/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/optional comments/i)).toBeInTheDocument();
    expect(screen.getByText(/140 characters remaining/i)).toBeInTheDocument();
  });

  it('disables submit until yes or no is selected', async () => {
    const { pageId, onSubmit } = defaultProps;
    render(<FeedbackSurvey pageId={pageId} onSubmit={onSubmit} />);

    await userEvent.click(await screen.findByRole('button', { name: /was this page helpful\?/i }));

    expect(screen.getByRole('button', { name: /^submit$/i })).toBeDisabled();

    await userEvent.click(screen.getByRole('radio', { name: /yes/i }));
    expect(screen.getByRole('button', { name: /^submit$/i })).not.toBeDisabled();
  });

  it('submits a comment-only payload', async () => {
    const mockOnSubmit = jest.fn().mockResolvedValue(undefined);
    render(
      <FeedbackSurvey
        pageId="test-dashboard"
        onSubmit={mockOnSubmit}
      />,
    );

    await userEvent.click(await screen.findByRole('button', { name: /was this page helpful\?/i }));
    await userEvent.click(await screen.findByRole('radio', { name: /yes/i }));
    await userEvent.click(screen.getByRole('button', { name: /^submit$/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          pageId: 'test-dashboard',
          response: 'yes',
          comment: '',
          timestamp: expect.any(String),
        }),
      );
    });
  });

  it('submits with trimmed comments', async () => {
    const mockOnSubmit = jest.fn().mockResolvedValue(undefined);
    render(
      <FeedbackSurvey
        pageId="test-dashboard"
        onSubmit={mockOnSubmit}
      />,
    );

    await userEvent.click(await screen.findByRole('button', { name: /was this page helpful\?/i }));
    await userEvent.click(await screen.findByRole('radio', { name: /no/i }));
    await userEvent.type(screen.getByLabelText(/optional comments/i), '  Needs more examples  ');
    await userEvent.click(screen.getByRole('button', { name: /^submit$/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          response: 'no',
          comment: 'Needs more examples',
        }),
      );
    });
  });

  it('updates remaining comment characters while typing', async () => {
    const { pageId, onSubmit } = defaultProps;
    render(<FeedbackSurvey pageId={pageId} onSubmit={onSubmit} />);

    await userEvent.click(await screen.findByRole('button', { name: /was this page helpful\?/i }));
    const textarea = await screen.findByLabelText(/optional comments/i);

    await userEvent.type(textarea, 'abc');

    expect(screen.getByText(/137 characters remaining/i)).toBeInTheDocument();
  });

  it('limits comment length to 140 characters', async () => {
    const { pageId, onSubmit } = defaultProps;
    render(<FeedbackSurvey pageId={pageId} onSubmit={onSubmit} />);

    await userEvent.click(await screen.findByRole('button', { name: /was this page helpful\?/i }));
    const textarea = await screen.findByLabelText(/optional comments/i);

    await userEvent.type(textarea, 'a'.repeat(180));

    expect(textarea.value).toHaveLength(140);
  });

  it('does not render when the server reports completion for the user/page', async () => {
    getSurveyFeedbackStatus.mockResolvedValue(true);

    render(
      <FeedbackSurvey
        pageId="test-dashboard"
        onSubmit={jest.fn()}
      />,
    );

    await waitFor(() => {
      expect(getSurveyFeedbackStatus).toHaveBeenCalledWith('test-dashboard');
    });

    expect(screen.queryByRole('button', { name: /was this page helpful\?/i })).not.toBeInTheDocument();
  });

  it('renders when completed is true and local override is set', async () => {
    getSurveyFeedbackStatus.mockResolvedValue(true);
    window.localStorage.setItem(ALWAYS_SHOW_SURVEY_KEY, 'true');

    render(
      <FeedbackSurvey
        pageId="test-dashboard"
        onSubmit={jest.fn()}
      />,
    );

    expect(await screen.findByRole('button', { name: /was this page helpful\?/i })).toBeInTheDocument();
  });

  it('hides trigger after successful submission', async () => {
    const mockOnSubmit = jest.fn().mockResolvedValue(undefined);

    render(
      <FeedbackSurvey
        pageId="test-dashboard"
        onSubmit={mockOnSubmit}
      />,
    );

    await userEvent.click(await screen.findByRole('button', { name: /was this page helpful\?/i }));
    await userEvent.click(await screen.findByRole('radio', { name: /yes/i }));
    await userEvent.click(screen.getByRole('button', { name: /^submit$/i }));

    expect(await screen.findByRole('button', { name: /submitted/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /was this page helpful\?/i })).not.toBeInTheDocument();
    }, { timeout: 2000 });
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

    await userEvent.click(await screen.findByRole('button', { name: /was this page helpful\?/i }));
    await userEvent.click(await screen.findByRole('radio', { name: /yes/i }));
    await userEvent.click(screen.getByRole('button', { name: /^submit$/i }));

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(screen.getByRole('button', { name: /was this page helpful\?/i, hidden: true })).toBeInTheDocument();
      expect(screen.getByText('Failed to submit survey, please try again later.')).toBeInTheDocument();
    });

    consoleErrorSpy.mockRestore();
  });

  it('returns survey button after successful submission when local override is set', async () => {
    window.localStorage.setItem(ALWAYS_SHOW_SURVEY_KEY, 'true');
    const mockOnSubmit = jest.fn().mockResolvedValue(undefined);

    render(
      <FeedbackSurvey
        pageId="test-dashboard"
        onSubmit={mockOnSubmit}
      />,
    );

    await userEvent.click(await screen.findByRole('button', { name: /was this page helpful\?/i }));
    await userEvent.click(await screen.findByRole('radio', { name: /yes/i }));
    await userEvent.click(screen.getByRole('button', { name: /^submit$/i }));

    expect(await screen.findByRole('button', { name: /submitted/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /was this page helpful\?/i })).toBeInTheDocument();
    }, { timeout: 2200 });
  });
});
