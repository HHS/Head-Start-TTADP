import React, { useState, useEffect, useRef } from 'react';
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
import { getSurveyFeedbackStatus } from '../fetchers/feedback';
import {
  ALWAYS_SHOW_SURVEY_KEY,
  getFeedbackSurveyDebugFlag,
} from '../utils/feedbackSurveyDebug';
import './FeedbackSurvey.scss';

const MAX_COMMENT_LENGTH = 140;
const SURVEY_STATUS = {
  COMPLETED: 'completed',
  SUBMITTED: 'submitted',
};

const SUBMITTED_ANIMATION_DURATION_MS = 1200;

const RESPONSE_VALUES = {
  NO: 'no',
  YES: 'yes',
};

function shouldAlwaysShowSurvey() {
  return getFeedbackSurveyDebugFlag(ALWAYS_SHOW_SURVEY_KEY);
}

function FeedbackSurvey({ pageId, onSubmit }) {
  const [surveyStatus, setSurveyStatus] = useState('pending');
  const [showPulse, setShowPulse] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState('');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const modalRef = useRef(null);
  const remainingCharacters = MAX_COMMENT_LENGTH - comment.length;

  useEffect(() => {
    let isMounted = true;

    const checkSurveyStatus = async () => {
      try {
        const completed = await getSurveyFeedbackStatus(pageId);
        if (!isMounted) {
          return;
        }

        if (completed && !shouldAlwaysShowSurvey()) {
          setSurveyStatus(SURVEY_STATUS.COMPLETED);
          return;
        }
      } catch (error) {
        // No-op: keep survey available if status check fails.
      }

      if (isMounted) {
        setSurveyStatus('ready');
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
    const startPulseTimer = setTimeout(() => setShowPulse(true), 450);
    const stopPulseTimer = setTimeout(() => setShowPulse(false), 1650);

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
      setSurveyStatus(shouldAlwaysShowSurvey() ? 'ready' : SURVEY_STATUS.COMPLETED);
    }, SUBMITTED_ANIMATION_DURATION_MS);

    return () => {
      clearTimeout(completionTimer);
    };
  }, [surveyStatus]);

  const handleSurveySubmit = async (event) => {
    event.preventDefault();

    if (!selectedResponse || isSubmitting) {
      return;
    }

    setSubmitError(false);
    setIsSubmitting(true);

    try {
      await onSubmit({
        pageId,
        response: selectedResponse,
        comment: (comment || '').trim(),
        timestamp: new Date().toISOString(),
      });

      modalRef.current?.toggleModal(false);
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

  return (
    <>
      <ModalToggleButton
        opener
        modalRef={modalRef}
        type="button"
        className={`usa-button survey-feedback__trigger-button ${showPulse ? 'survey-feedback__trigger-button--pulse' : ''} ${surveyStatus === SURVEY_STATUS.SUBMITTED ? 'survey-feedback__trigger-button--submitted' : ''} position-fixed right-2 bottom-2 margin-0`}
        disabled={surveyStatus === SURVEY_STATUS.SUBMITTED}
      >
        {surveyStatus === SURVEY_STATUS.SUBMITTED ? 'Submitted' : 'Was this page helpful?'}
      </ModalToggleButton>

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
          <Fieldset className="margin-top-0 margin-bottom-3">
            <Label className="margin-top-0 text-bold" htmlFor={`survey-response-yes-${pageId}`}>
              Did you find this page helpful?
              {' '}
              <span className="text-secondary-vivid">*</span>
            </Label>
            <Radio
              id={`survey-response-yes-${pageId}`}
              name={`survey-response-${pageId}`}
              label="Yes"
              value={RESPONSE_VALUES.YES}
              checked={selectedResponse === RESPONSE_VALUES.YES}
              onChange={(e) => setSelectedResponse(e.target.value)}
            />
            <Radio
              id={`survey-response-no-${pageId}`}
              name={`survey-response-${pageId}`}
              label="No"
              value={RESPONSE_VALUES.NO}
              checked={selectedResponse === RESPONSE_VALUES.NO}
              onChange={(e) => setSelectedResponse(e.target.value)}
            />
          </Fieldset>

          <div className="margin-bottom-3">
            <Label
              htmlFor={`feedback-comment-${pageId}`}
              className="margin-top-0 survey-feedback__optional-comments-label"
            >
              Optional Comments
            </Label>
            <p className="margin-top-1 margin-bottom-1 font-sans-xs text-base-dark">
              Want to tell us more? Please do not put Personal Identifiable
              {' '}
              Information (PII) in this field.
            </p>
            <Textarea
              id={`feedback-comment-${pageId}`}
              name="feedback-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={MAX_COMMENT_LENGTH}
              aria-describedby={`char-count-${pageId}`}
            />
            <div id={`char-count-${pageId}`} className="font-sans-sm text-base margin-top-1">
              {remainingCharacters}
              {' '}
              characters remaining
            </div>
          </div>

          {submitError && (
            <Alert type="error" role="alert" className="margin-top-2 margin-bottom-2">
              Failed to submit survey, please try again later.
            </Alert>
          )}

          <Button type="submit" disabled={!selectedResponse || isSubmitting}>
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
