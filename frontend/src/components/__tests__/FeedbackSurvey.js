import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FeedbackSurvey from '../FeedbackSurvey';
import { getActiveFeedbackSurvey } from '../../fetchers/feedback';

jest.mock('../../fetchers/feedback', () => ({
  getActiveFeedbackSurvey: jest.fn(),
}));

const ALWAYS_SHOW_SURVEY_KEY = 'ttahub:alwaysShowFeedbackSurvey';

const SURVEY = {
  id: 7,
  pageId: 'test-dashboard',
  questions: [
    { id: 11, questionText: 'Did you find this page helpful?', order: 1 },
    { id: 12, questionText: 'Was the data easy to understand?', order: 2 },
  ],
};

const openSurvey = async () => {
  await userEvent.click(await screen.findByRole('button', { name: /was this page helpful\?/i }));
};

const questionGroup = (name) => screen.getByRole('group', { name });

const answerAll = async (response = /yes/i) => {
  await userEvent.click(within(questionGroup(/did you find this page helpful/i)).getByRole('radio', { name: response }));
  await userEvent.click(within(questionGroup(/was the data easy/i)).getByRole('radio', { name: response }));
};

describe('FeedbackSurvey', () => {
  const defaultProps = {
    pageId: 'test-dashboard',
    onSubmit: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getActiveFeedbackSurvey.mockResolvedValue({ survey: SURVEY, completed: false });
    jest.useRealTimers();
    window.history.pushState({}, '', '/');
    window.localStorage.removeItem(ALWAYS_SHOW_SURVEY_KEY);
  });

  it('shows the lower-right trigger button when a survey is active', async () => {
    render(<FeedbackSurvey {...defaultProps} />);

    expect(await screen.findByRole('button', { name: /was this page helpful\?/i })).toBeInTheDocument();
    expect(getActiveFeedbackSurvey).toHaveBeenCalledWith('test-dashboard');
  });

  it('does not render when no survey is active for the page', async () => {
    getActiveFeedbackSurvey.mockResolvedValue({ survey: null, completed: false });

    render(<FeedbackSurvey {...defaultProps} />);

    await waitFor(() => expect(getActiveFeedbackSurvey).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: /was this page helpful\?/i })).not.toBeInTheDocument();
  });

  it('does not render when the active survey lookup fails', async () => {
    getActiveFeedbackSurvey.mockRejectedValue(new Error('nope'));

    render(<FeedbackSurvey {...defaultProps} />);

    await waitFor(() => expect(getActiveFeedbackSurvey).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: /was this page helpful\?/i })).not.toBeInTheDocument();
  });

  it('renders every question with yes/no and its own comment box', async () => {
    render(<FeedbackSurvey {...defaultProps} />);

    await openSurvey();

    expect(await screen.findByRole('heading', { name: /how did we do\?/i, level: 2 })).toBeInTheDocument();
    SURVEY.questions.forEach(({ questionText }) => {
      const group = questionGroup(new RegExp(questionText.replace('?', '\\?'), 'i'));
      expect(within(group).getByRole('radio', { name: /yes/i })).toBeInTheDocument();
      expect(within(group).getByRole('radio', { name: /no/i })).toBeInTheDocument();
      expect(within(group).getByLabelText(/optional comments/i)).toBeInTheDocument();
    });
    expect(screen.getAllByText(/140 characters remaining/i)).toHaveLength(2);
  });

  it('disables submit until every question has an answer', async () => {
    render(<FeedbackSurvey {...defaultProps} />);

    await openSurvey();
    const submit = screen.getByRole('button', { name: /^submit$/i });
    expect(submit).toBeDisabled();

    await userEvent.click(within(questionGroup(/did you find this page helpful/i)).getByRole('radio', { name: /yes/i }));
    expect(submit).toBeDisabled();

    await userEvent.click(within(questionGroup(/was the data easy/i)).getByRole('radio', { name: /no/i }));
    expect(submit).not.toBeDisabled();
  });

  it('submits one answer per question with trimmed comments', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(<FeedbackSurvey pageId="test-dashboard" onSubmit={onSubmit} />);

    await openSurvey();
    await userEvent.click(within(questionGroup(/did you find this page helpful/i)).getByRole('radio', { name: /yes/i }));
    await userEvent.click(within(questionGroup(/was the data easy/i)).getByRole('radio', { name: /no/i }));
    await userEvent.type(
      within(questionGroup(/was the data easy/i)).getByLabelText(/optional comments/i),
      '  Too many charts  ',
    );
    await userEvent.click(screen.getByRole('button', { name: /^submit$/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        surveyId: 7,
        responses: [
          { questionId: 11, response: 'yes', comment: '' },
          { questionId: 12, response: 'no', comment: 'Too many charts' },
        ],
      });
    });
  });

  it('tracks remaining characters per comment box', async () => {
    render(<FeedbackSurvey {...defaultProps} />);

    await openSurvey();
    await userEvent.type(within(questionGroup(/did you find this page helpful/i)).getByLabelText(/optional comments/i), 'abc');

    expect(screen.getByText(/137 characters remaining/i)).toBeInTheDocument();
    expect(screen.getByText(/140 characters remaining/i)).toBeInTheDocument();
  });

  it('limits comment length to 140 characters', async () => {
    render(<FeedbackSurvey {...defaultProps} />);

    await openSurvey();
    const textarea = within(questionGroup(/did you find this page helpful/i)).getByLabelText(/optional comments/i);
    await userEvent.type(textarea, 'a'.repeat(180));

    expect(textarea.value).toHaveLength(140);
  });

  it('does not render when the user already completed the active survey', async () => {
    getActiveFeedbackSurvey.mockResolvedValue({ survey: SURVEY, completed: true });

    render(<FeedbackSurvey {...defaultProps} />);

    await waitFor(() => expect(getActiveFeedbackSurvey).toHaveBeenCalledWith('test-dashboard'));
    expect(screen.queryByRole('button', { name: /was this page helpful\?/i })).not.toBeInTheDocument();
  });

  it('renders when completed is true and local override is set', async () => {
    getActiveFeedbackSurvey.mockResolvedValue({ survey: SURVEY, completed: true });
    window.localStorage.setItem(ALWAYS_SHOW_SURVEY_KEY, 'true');

    render(<FeedbackSurvey {...defaultProps} />);

    expect(await screen.findByRole('button', { name: /was this page helpful\?/i })).toBeInTheDocument();
  });

  it('hides trigger after successful submission', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(<FeedbackSurvey pageId="test-dashboard" onSubmit={onSubmit} />);

    await openSurvey();
    await answerAll();
    await userEvent.click(screen.getByRole('button', { name: /^submit$/i }));

    expect(await screen.findByRole('button', { name: /submitted/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /was this page helpful\?/i })).not.toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('handles submission errors and keeps survey available', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const onSubmit = jest.fn().mockRejectedValue(new Error('Network error'));

    render(<FeedbackSurvey pageId="test-dashboard" onSubmit={onSubmit} />);

    await openSurvey();
    await answerAll();
    await userEvent.click(screen.getByRole('button', { name: /^submit$/i }));

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(screen.getByRole('button', { name: /was this page helpful\?/i, hidden: true })).toBeInTheDocument();
      expect(screen.getByText('Failed to submit survey, please try again later.')).toBeInTheDocument();
    });

    consoleErrorSpy.mockRestore();
  });

  it('clears the show-survey override after submission so the survey stays hidden', async () => {
    window.localStorage.setItem(ALWAYS_SHOW_SURVEY_KEY, 'true');
    const onSubmit = jest.fn().mockResolvedValue(undefined);

    render(<FeedbackSurvey pageId="test-dashboard" onSubmit={onSubmit} />);

    await openSurvey();
    await answerAll();
    await userEvent.click(screen.getByRole('button', { name: /^submit$/i }));

    expect(await screen.findByRole('button', { name: /submitted/i })).toBeInTheDocument();
    expect(window.localStorage.getItem(ALWAYS_SHOW_SURVEY_KEY)).toBeNull();

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /was this page helpful\?/i })).not.toBeInTheDocument();
    }, { timeout: 2200 });
  });

  it('stays hidden on the next load after it was answered with the override', async () => {
    // Server reports completion and the override was cleared by the submission
    getActiveFeedbackSurvey.mockResolvedValue({ survey: SURVEY, completed: true });

    render(<FeedbackSurvey {...defaultProps} />);

    await waitFor(() => expect(getActiveFeedbackSurvey).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: /was this page helpful\?/i })).not.toBeInTheDocument();
  });

  describe('end date card', () => {
    it('slides in after the button pulse when the survey has an end date', async () => {
      getActiveFeedbackSurvey.mockResolvedValue({ survey: { ...SURVEY, endDate: '2026-11-05' }, completed: false });

      render(<FeedbackSurvey {...defaultProps} />);

      const button = await screen.findByRole('button', { name: /was this page helpful\?/i });
      // Still pulsing: the card waits for the button animation to finish
      expect(screen.queryByText(/ends on/i)).not.toBeInTheDocument();

      const card = await screen.findByText('Ends on 11/05/2026', {}, { timeout: 2500 });
      expect(card).toHaveClass('survey-feedback__end-date-card');
      expect(button).toHaveAttribute('aria-describedby', card.id);
    });

    it('renders decorative sparkles above the card, hidden from screen readers', async () => {
      getActiveFeedbackSurvey.mockResolvedValue({ survey: { ...SURVEY, endDate: '2026-11-05' }, completed: false });

      render(<FeedbackSurvey {...defaultProps} />);

      await screen.findByText('Ends on 11/05/2026', {}, { timeout: 2500 });
      const sparkles = screen.getByTestId('survey-feedback-sparkles');
      expect(sparkles).toHaveAttribute('aria-hidden', 'true');
      expect(sparkles.querySelectorAll('.survey-feedback__sparkle')).toHaveLength(9);
    });

    it('is not shown for surveys that close manually', async () => {
      getActiveFeedbackSurvey.mockResolvedValue({ survey: { ...SURVEY, endDate: null }, completed: false });

      render(<FeedbackSurvey {...defaultProps} />);

      const button = await screen.findByRole('button', { name: /was this page helpful\?/i });
      await new Promise((resolve) => { setTimeout(resolve, 1900); });

      expect(screen.queryByText(/ends on/i)).not.toBeInTheDocument();
      expect(button).not.toHaveAttribute('aria-describedby');
    });

    it('is not shown when the user already completed the survey', async () => {
      getActiveFeedbackSurvey.mockResolvedValue({ survey: { ...SURVEY, endDate: '2026-11-05' }, completed: true });

      render(<FeedbackSurvey {...defaultProps} />);

      await waitFor(() => expect(getActiveFeedbackSurvey).toHaveBeenCalled());
      await new Promise((resolve) => { setTimeout(resolve, 1900); });

      expect(screen.queryByText(/ends on/i)).not.toBeInTheDocument();
    });

    it('hides once the survey is submitted', async () => {
      getActiveFeedbackSurvey.mockResolvedValue({ survey: { ...SURVEY, endDate: '2026-11-05' }, completed: false });
      const onSubmit = jest.fn().mockResolvedValue(undefined);

      render(<FeedbackSurvey pageId="test-dashboard" onSubmit={onSubmit} />);

      await screen.findByText('Ends on 11/05/2026', {}, { timeout: 2500 });
      await openSurvey();
      await answerAll();
      await userEvent.click(screen.getByRole('button', { name: /^submit$/i }));

      expect(await screen.findByRole('button', { name: /submitted/i })).toBeInTheDocument();
      expect(screen.queryByText(/ends on/i)).not.toBeInTheDocument();
    });
  });
});
