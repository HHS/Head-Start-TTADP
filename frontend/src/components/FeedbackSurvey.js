import React, { useState, useEffect, useRef } from 'react';
import moment from 'moment';
import PropTypes from 'prop-types';
import {
  Alert,
  Button,
  Fieldset,
  Label,
  ModalToggleButton,
  Radio,
  Textarea,
} from '@trussworks/react-uswds';
import VanillaModal from './VanillaModal';
import { getActiveFeedbackSurvey } from '../fetchers/feedback';
import {
  ALWAYS_SHOW_SURVEY_KEY,
  getFeedbackSurveyDebugFlag,
  setFeedbackSurveyDebugFlag,
} from '../utils/feedbackSurveyDebug';
import './FeedbackSurvey.scss';

const MAX_COMMENT_LENGTH = 140;
const SURVEY_STATUS = {
  COMPLETED: 'completed',
  SUBMITTED: 'submitted',
};

const SUBMITTED_ANIMATION_DURATION_MS = 1200;
const PULSE_START_MS = 450;
// The end date card slides out once the pulse animation has finished
const PULSE_END_MS = 1650;
// Decorative sparkles that burst from the top of the end date card; each is positioned in SCSS
const SPARKLE_COUNT = 9;

const RESPONSE_VALUES = {
  NO: 'no',
  YES: 'yes',
};

function shouldAlwaysShowSurvey() {
  return getFeedbackSurveyDebugFlag(ALWAYS_SHOW_SURVEY_KEY);
}

function FeedbackSurvey({ pageId, onSubmit }) {
  const [surveyStatus, setSurveyStatus] = useState('pending');
  const [survey, setSurvey] = useState(null);
  const [showPulse, setShowPulse] = useState(false);
  const [showEndDateCard, setShowEndDateCard] = useState(false);
  // Keyed by question id: { response, comment }
  const [answers, setAnswers] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const modalRef = useRef(null);

  const questions = survey ? survey.questions : [];
  const allAnswered = questions.length > 0 && questions.every((q) => answers[q.id]?.response);

  const updateAnswer = (questionId, field, value) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], [field]: value },
    }));
  };

  useEffect(() => {
    let isMounted = true;

    const checkSurveyStatus = async () => {
      try {
        const { survey: activeSurvey, completed } = await getActiveFeedbackSurvey(pageId);
        if (!isMounted) {
          return;
        }

        // Nothing to show when the page has no survey running or the user already answered it
        if (!activeSurvey || !activeSurvey.questions?.length) {
          setSurveyStatus(SURVEY_STATUS.COMPLETED);
          return;
        }

        setSurvey(activeSurvey);

        if (completed && !shouldAlwaysShowSurvey()) {
          setSurveyStatus(SURVEY_STATUS.COMPLETED);
          return;
        }

        setSurveyStatus('ready');
      } catch (error) {
        // Without a survey definition there are no questions to ask, so stay hidden.
        if (isMounted) {
          setSurveyStatus(SURVEY_STATUS.COMPLETED);
        }
      }
    };

    checkSurveyStatus();

    return () => {
      isMounted = false;
    };
  }, [pageId]);

  useEffect(() => {
    if (surveyStatus !== 'ready') {
      return undefined;
    }

    // Trigger a quick pulse shortly after the button appears, then stop.
    const startPulseTimer = setTimeout(() => setShowPulse(true), PULSE_START_MS);
    const stopPulseTimer = setTimeout(() => {
      setShowPulse(false);
      setShowEndDateCard(true);
    }, PULSE_END_MS);

    return () => {
      clearTimeout(startPulseTimer);
      clearTimeout(stopPulseTimer);
    };
  }, [surveyStatus]);

  useEffect(() => {
    if (surveyStatus !== SURVEY_STATUS.SUBMITTED) {
      return undefined;
    }

    const completionTimer = setTimeout(() => {
      setSurveyStatus(SURVEY_STATUS.COMPLETED);
    }, SUBMITTED_ANIMATION_DURATION_MS);

    return () => {
      clearTimeout(completionTimer);
    };
  }, [surveyStatus]);

  const handleSurveySubmit = async (event) => {
    event.preventDefault();

    if (!allAnswered || isSubmitting) {
      return;
    }

    setSubmitError(false);
    setIsSubmitting(true);

    try {
      await onSubmit({
        surveyId: survey.id,
        responses: questions.map((q) => ({
          questionId: q.id,
          response: answers[q.id].response,
          comment: (answers[q.id].comment || '').trim(),
        })),
        timestamp: new Date().toISOString(),
      });

      modalRef.current?.toggleModal(false);
      // The "Show survey" testing override is one-shot: once answered, the survey stays hidden
      // until someone re-enables it
      setFeedbackSurveyDebugFlag(ALWAYS_SHOW_SURVEY_KEY, false);
      setSurveyStatus(SURVEY_STATUS.SUBMITTED);
    } catch (error) {
      setSubmitError(true);
      // eslint-disable-next-line no-console
      console.error('Failed to submit feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (surveyStatus === SURVEY_STATUS.COMPLETED) {
    return null;
  }

  if (surveyStatus !== 'ready' && surveyStatus !== SURVEY_STATUS.SUBMITTED) {
    return null;
  }

  // Surveys that close manually have no end date, so there is nothing to count down to
  const endDateLabel = survey?.endDate ? moment(survey.endDate, 'YYYY-MM-DD').format('MM/DD/YYYY') : null;
  const endDateCardId = `survey-feedback-end-date-${pageId}`;
  const showEndDate = Boolean(endDateLabel) && showEndDateCard && surveyStatus === 'ready';

  return (
    <>
      <div className="survey-feedback__dock position-fixed right-2 bottom-2 display-flex flex-column flex-align-center">
        {showEndDate && (
          <div className="survey-feedback__end-date">
            <span className="survey-feedback__sparkles" aria-hidden="true" data-testid="survey-feedback-sparkles">
              {Array.from({ length: SPARKLE_COUNT }, (_, index) => (
                <span key={index} className="survey-feedback__sparkle" />
              ))}
            </span>
            <div
              id={endDateCardId}
              className="survey-feedback__end-date-card padding-x-105 padding-top-05 radius-top-md text-white text-bold font-sans-3xs"
            >
              Ends on
              {' '}
              {endDateLabel}
            </div>
          </div>
        )}
        <ModalToggleButton
          opener
          modalRef={modalRef}
          type="button"
          className={`usa-button survey-feedback__trigger-button ${showPulse ? 'survey-feedback__trigger-button--pulse' : ''} ${surveyStatus === SURVEY_STATUS.SUBMITTED ? 'survey-feedback__trigger-button--submitted' : ''} margin-0`}
          disabled={surveyStatus === SURVEY_STATUS.SUBMITTED}
          aria-describedby={showEndDate ? endDateCardId : undefined}
        >
          {surveyStatus === SURVEY_STATUS.SUBMITTED ? 'Submitted' : 'Was this page helpful?'}
        </ModalToggleButton>
      </div>

      <VanillaModal
        heading="How did we do?"
        modalRef={modalRef}
        id={`survey-feedback-${pageId}`}
        className="survey-feedback__modal"
      >
        <p className="margin-top-0 margin-bottom-2 font-sans-sm">
          Select &quot;Yes&quot; or &quot;No.&quot; Add additional comments if you
          {' '}
          would like to, then select &quot;Submit.&quot;
        </p>
        <p className="margin-top-0 margin-bottom-3 font-sans-xs text-base-dark">
          A red asterisk (
          <span className="text-secondary-vivid">*</span>
          ) indicates a required field.
        </p>

        <form onSubmit={handleSurveySubmit} noValidate>
          {questions.map((question) => {
            const answer = answers[question.id] || {};
            const comment = answer.comment || '';
            const idSuffix = `${pageId}-${question.id}`;

            return (
              <Fieldset key={question.id} className="margin-top-0 margin-bottom-3">
                <legend className="usa-legend margin-top-0 text-bold">
                  {question.questionText}
                  {' '}
                  <span className="text-secondary-vivid">*</span>
                </legend>
                <Radio
                  id={`survey-response-yes-${idSuffix}`}
                  name={`survey-response-${idSuffix}`}
                  label="Yes"
                  value={RESPONSE_VALUES.YES}
                  checked={answer.response === RESPONSE_VALUES.YES}
                  onChange={(e) => updateAnswer(question.id, 'response', e.target.value)}
                />
                <Radio
                  id={`survey-response-no-${idSuffix}`}
                  name={`survey-response-${idSuffix}`}
                  label="No"
                  value={RESPONSE_VALUES.NO}
                  checked={answer.response === RESPONSE_VALUES.NO}
                  onChange={(e) => updateAnswer(question.id, 'response', e.target.value)}
                />

                <Label
                  htmlFor={`feedback-comment-${idSuffix}`}
                  className="survey-feedback__optional-comments-label"
                >
                  Optional Comments
                </Label>
                <p className="margin-top-1 margin-bottom-1 font-sans-xs text-base-dark">
                  Want to tell us more? Please do not put Personal Identifiable
                  {' '}
                  Information (PII) in this field.
                </p>
                <Textarea
                  id={`feedback-comment-${idSuffix}`}
                  name={`feedback-comment-${question.id}`}
                  value={comment}
                  onChange={(e) => updateAnswer(question.id, 'comment', e.target.value)}
                  maxLength={MAX_COMMENT_LENGTH}
                  aria-describedby={`char-count-${idSuffix}`}
                />
                <div id={`char-count-${idSuffix}`} className="font-sans-sm text-base margin-top-1">
                  {MAX_COMMENT_LENGTH - comment.length}
                  {' '}
                  characters remaining
                </div>
              </Fieldset>
            );
          })}

          {submitError && (
            <Alert type="error" role="alert" className="margin-top-2 margin-bottom-2">
              Failed to submit survey, please try again later.
            </Alert>
          )}

          <Button type="submit" disabled={!allAnswered || isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </Button>
        </form>
      </VanillaModal>
    </>
  );
}

FeedbackSurvey.propTypes = {
  pageId: PropTypes.string.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export default FeedbackSurvey;
