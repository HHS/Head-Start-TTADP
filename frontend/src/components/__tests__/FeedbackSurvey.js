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

  it('renders the survey component', () => {
    const { pageId, onSubmit } = defaultProps;
    render(<FeedbackSurvey pageId={pageId} onSubmit={onSubmit} />);
    expect(screen.getByText('How useful is this page?')).toBeInTheDocument();
  });

  it('displays rating options from 1 to 10', () => {
    const { pageId, onSubmit } = defaultProps;
    render(<FeedbackSurvey pageId={pageId} onSubmit={onSubmit} />);
    for (let i = 1; i <= 10; i += 1) {
      expect(screen.getByLabelText(i.toString())).toBeInTheDocument();
    }
  });

  it('allows selecting a rating', async () => {
    const { pageId, onSubmit } = defaultProps;
    render(<FeedbackSurvey pageId={pageId} onSubmit={onSubmit} />);
    const rating5 = screen.getByLabelText('5');
    await userEvent.click(rating5);
    expect(rating5).toBeChecked();
  });

  it('only allows one rating to be selected at a time', async () => {
    const { pageId, onSubmit } = defaultProps;
    render(<FeedbackSurvey pageId={pageId} onSubmit={onSubmit} />);
    const rating3 = screen.getByLabelText('3');
    const rating7 = screen.getByLabelText('7');

    await userEvent.click(rating3);
    expect(rating3).toBeChecked();

    await userEvent.click(rating7);
    expect(rating7).toBeChecked();
    expect(rating3).not.toBeChecked();
  });

  it('expands and collapses comment section', async () => {
    const { pageId, onSubmit } = defaultProps;
    render(<FeedbackSurvey pageId={pageId} onSubmit={onSubmit} />);

    const expandButton = screen.getByRole('button', { name: /add additional comments/i });
    expect(screen.queryByLabelText(/additional comments/i)).not.toBeInTheDocument();

    await userEvent.click(expandButton);
    expect(screen.getByLabelText(/additional comments/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /hide additional comments/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /hide additional comments/i }));
    expect(screen.queryByLabelText(/additional comments/i)).not.toBeInTheDocument();
  });

  it('limits comment length to 300 characters', async () => {
    const { pageId, onSubmit } = defaultProps;
    render(<FeedbackSurvey pageId={pageId} onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole('button', { name: /add additional comments/i }));
    const textarea = screen.getByLabelText(/additional comments/i);

    const longText = 'a'.repeat(350);
    await userEvent.type(textarea, longText);

    expect(textarea.value).toHaveLength(300);
    expect(screen.getByText(/300\/300 characters/)).toBeInTheDocument();
  });

  it('disables submit button when no rating is selected', () => {
    const { pageId, onSubmit } = defaultProps;
    render(<FeedbackSurvey pageId={pageId} onSubmit={onSubmit} />);
    const submitButton = screen.getByRole('button', { name: /submit feedback/i });
    expect(submitButton).toBeDisabled();
  });

  it('enables submit button when rating is selected', async () => {
    const { pageId, onSubmit } = defaultProps;
    render(<FeedbackSurvey pageId={pageId} onSubmit={onSubmit} />);
    const rating8 = screen.getByLabelText('8');
    await userEvent.click(rating8);

    const submitButton = screen.getByRole('button', { name: /submit feedback/i });
    expect(submitButton).not.toBeDisabled();
  });

  it('calls onSubmit with correct data when submitted', async () => {
    const mockOnSubmit = jest.fn().mockResolvedValue(undefined);
    render(
      <FeedbackSurvey
        pageId="test-dashboard"
        onSubmit={mockOnSubmit}
      />,
    );

    await userEvent.click(screen.getByLabelText('7'));
    await userEvent.click(screen.getByRole('button', { name: /add additional comments/i }));
    await userEvent.type(screen.getByLabelText(/additional comments/i), 'Great dashboard!');
    await userEvent.click(screen.getByRole('button', { name: /submit feedback/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          pageId: 'test-dashboard',
          rating: 7,
          surveyType: 'scale',
          thumbs: null,
          comment: 'Great dashboard!',
          timestamp: expect.any(String),
        }),
      );
    });
  });

  it('dismisses survey and stores in localStorage when X is clicked', async () => {
    const { pageId, onSubmit } = defaultProps;
    render(<FeedbackSurvey pageId={pageId} onSubmit={onSubmit} />);

    const closeButton = screen.getByRole('button', { name: /dismiss survey/i });
    await userEvent.click(closeButton);

    await waitFor(() => {
      expect(localStorage.getItem('survey-feedback-dismissed-test-dashboard')).toBe('collapsed');
    });
    expect(screen.queryByText('How useful is this page?')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reopen survey/i })).toBeInTheDocument();
  });

  it('shows reopen button if previously dismissed', () => {
    const { pageId, onSubmit } = defaultProps;
    localStorage.setItem('survey-feedback-dismissed-test-dashboard', 'collapsed');
    render(<FeedbackSurvey pageId={pageId} onSubmit={onSubmit} />);
    expect(screen.queryByText('How useful is this page?')).not.toBeInTheDocument();
    const reopenButton = screen.getByRole('button', { name: /reopen survey/i });
    expect(reopenButton).toBeInTheDocument();
    expect(screen.getByRole('tooltip', { name: /expand survey/i })).toBeInTheDocument();
    expect(reopenButton).toHaveAttribute(
      'aria-describedby',
      'survey-feedback-reopen-tooltip-test-dashboard',
    );
  });

  it('does not render when previously completed', () => {
    localStorage.setItem('survey-feedback-dismissed-test-dashboard', 'completed');

    render(
      <FeedbackSurvey
        pageId="test-dashboard"
        onSubmit={jest.fn()}
      />,
    );

    expect(screen.queryByText('How useful is this page?')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reopen survey/i })).not.toBeInTheDocument();
  });

  it('reopens survey when reopen button is clicked', async () => {
    const { pageId, onSubmit } = defaultProps;
    localStorage.setItem('survey-feedback-dismissed-test-dashboard', 'collapsed');
    render(<FeedbackSurvey pageId={pageId} onSubmit={onSubmit} />);

    await userEvent.click(screen.getByRole('button', { name: /reopen survey/i }));
    expect(screen.getByText('How useful is this page?')).toBeInTheDocument();
    expect(localStorage.getItem('survey-feedback-dismissed-test-dashboard')).toBeNull();
  });

  it('dismisses survey after successful submission', async () => {
    const mockOnSubmit = jest.fn().mockResolvedValue(undefined);
    render(
      <FeedbackSurvey
        pageId="test-dashboard"
        onSubmit={mockOnSubmit}
      />,
    );

    await userEvent.click(screen.getByLabelText('9'));
    await userEvent.click(screen.getByRole('button', { name: /submit feedback/i }));

    await waitFor(() => {
      expect(localStorage.getItem('survey-feedback-dismissed-test-dashboard')).toBe('completed');
      expect(screen.queryByText('How useful is this page?')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /reopen survey/i })).not.toBeInTheDocument();
    });
  });

  it('handles submission error gracefully', async () => {
    const mockOnSubmit = jest.fn().mockRejectedValue(new Error('Network error'));
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <FeedbackSurvey
        pageId="test-dashboard"
        onSubmit={mockOnSubmit}
      />,
    );

    await userEvent.click(screen.getByLabelText('6'));
    await userEvent.click(screen.getByRole('button', { name: /submit feedback/i }));

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(screen.getByText('How useful is this page?')).toBeInTheDocument();
    });

    consoleErrorSpy.mockRestore();
  });

  it('displays scale labels', () => {
    const { pageId, onSubmit } = defaultProps;
    render(<FeedbackSurvey pageId={pageId} onSubmit={onSubmit} />);
    expect(screen.getByText('Not useful')).toBeInTheDocument();
    expect(screen.getByText('Very useful')).toBeInTheDocument();
  });

  it('uses unique IDs based on pageId', () => {
    render(
      <FeedbackSurvey
        pageId="unique-page"
        onSubmit={jest.fn()}
      />,
    );
    expect(screen.getByLabelText('1')).toHaveAttribute('id', 'rating-1-unique-page');
  });

  it('trims whitespace from comment before submission', async () => {
    const mockOnSubmit = jest.fn().mockResolvedValue(undefined);
    render(
      <FeedbackSurvey
        pageId="test-dashboard"
        onSubmit={mockOnSubmit}
      />,
    );

    await userEvent.click(screen.getByLabelText('5'));
    await userEvent.click(screen.getByRole('button', { name: /add additional comments/i }));
    await userEvent.type(screen.getByLabelText(/additional comments/i), '  comment with spaces  ');
    await userEvent.click(screen.getByRole('button', { name: /submit feedback/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          comment: 'comment with spaces',
        }),
      );
    });
  });

  it('renders thumbs mode title and controls when useThumbRating is true', () => {
    render(
      <FeedbackSurvey
        pageId="thumbs-page"
        onSubmit={jest.fn()}
        useThumbRating
      />,
    );

    expect(screen.getByText('How are we doing on this page?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /thumbs up/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /thumbs down/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add additional comments/i })).not.toBeInTheDocument();
  });

  it('only allows one thumb selection at a time', async () => {
    render(
      <FeedbackSurvey
        pageId="thumbs-page"
        onSubmit={jest.fn()}
        useThumbRating
      />,
    );

    const thumbsUp = screen.getByRole('button', { name: /thumbs up/i });
    const thumbsDown = screen.getByRole('button', { name: /thumbs down/i });

    await userEvent.click(thumbsUp);
    expect(thumbsUp).toHaveAttribute('aria-pressed', 'true');
    expect(thumbsDown).toHaveAttribute('aria-pressed', 'false');

    await userEvent.click(thumbsDown);
    expect(thumbsDown).toHaveAttribute('aria-pressed', 'true');
    expect(thumbsUp).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows optional comments for thumbs up and allows submit without comments', async () => {
    const mockOnSubmit = jest.fn().mockResolvedValue(undefined);
    render(
      <FeedbackSurvey
        pageId="thumbs-page"
        onSubmit={mockOnSubmit}
        useThumbRating
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /thumbs up/i }));

    expect(screen.getByLabelText(/tell us what you like about this page \(optional\):/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit feedback/i })).not.toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: /submit feedback/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          rating: 10,
          surveyType: 'thumbs',
          thumbs: 'up',
          comment: '',
        }),
      );
    });
  });

  it('requires comments for thumbs down with the expected prompt', async () => {
    const mockOnSubmit = jest.fn().mockResolvedValue(undefined);
    render(
      <FeedbackSurvey
        pageId="thumbs-page"
        onSubmit={mockOnSubmit}
        useThumbRating
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /thumbs down/i }));

    const textarea = screen.getByLabelText(/tell us what we can do better:/i);
    expect(textarea).toBeRequired();

    const submitButton = screen.getByRole('button', { name: /submit feedback/i });
    expect(submitButton).toBeDisabled();

    await userEvent.type(textarea, 'Need faster page loading');
    expect(submitButton).not.toBeDisabled();

    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          rating: 1,
          surveyType: 'thumbs',
          thumbs: 'down',
          comment: 'Need faster page loading',
        }),
      );
    });
  });

  it('scrolls to and focuses comments when thumbs down makes comments required', async () => {
    const scrollIntoViewMock = jest.fn();
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

    render(
      <FeedbackSurvey
        pageId="thumbs-page"
        onSubmit={jest.fn()}
        useThumbRating
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /thumbs down/i }));

    const textarea = screen.getByLabelText(/tell us what we can do better:/i);
    await waitFor(() => {
      expect(scrollIntoViewMock).toHaveBeenCalled();
      expect(textarea).toHaveFocus();
    });

    HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
  });

  it('scrolls to comments when thumbs up is selected', async () => {
    const scrollIntoViewMock = jest.fn();
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

    render(
      <FeedbackSurvey
        pageId="thumbs-page"
        onSubmit={jest.fn()}
        useThumbRating
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /thumbs up/i }));

    await waitFor(() => {
      expect(scrollIntoViewMock).toHaveBeenCalled();
    });

    HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
  });

  it('uses container scrollTo when available', async () => {
    const scrollToMock = jest.fn();
    const originalScrollTo = HTMLElement.prototype.scrollTo;
    HTMLElement.prototype.scrollTo = scrollToMock;

    render(
      <FeedbackSurvey
        pageId="thumbs-page"
        onSubmit={jest.fn()}
        useThumbRating
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: /thumbs up/i }));

    await waitFor(() => {
      expect(scrollToMock).toHaveBeenCalledWith(
        expect.objectContaining({
          behavior: 'smooth',
        }),
      );
    });

    HTMLElement.prototype.scrollTo = originalScrollTo;
  });
});
