import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  Button,
  Fieldset,
  Label,
  Modal,
  ModalHeading,
  ModalToggleButton,
  Radio,
  Textarea,
} from '@trussworks/react-uswds';
import './FeedbackSurvey.scss';

const MAX_COMMENT_LENGTH = 140;
const SURVEY_STATUS = {
  COMPLETED: 'completed',
};

const RESPONSE_VALUES = {
  NO: 'no',
  YES: 'yes',
};

const RESPONSE_TO_SUBMISSION = {
  [RESPONSE_VALUES.YES]: {
    rating: 10,
    thumbs: 'yes',
  },
  [RESPONSE_VALUES.NO]: {
    rating: 1,
    thumbs: 'no',
  },
};

function FeedbackSurvey({ pageId, onSubmit }) {
  const storageKey = `survey-feedback-dismissed-${pageId}`;
  const [surveyStatus, setSurveyStatus] = useState('pending');
  const [showPulse, setShowPulse] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState('');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const modalRef = useRef(null);
  const remainingCharacters = MAX_COMMENT_LENGTH - comment.length;

  useEffect(() => {
    const dismissed = localStorage.getItem(storageKey);
    if (dismissed === SURVEY_STATUS.COMPLETED) {
      setSurveyStatus(SURVEY_STATUS.COMPLETED);
      return;
    }

    setSurveyStatus('ready');
  }, [storageKey]);

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

  const handleSurveySubmit = async (event) => {
    event.preventDefault();

    if (!selectedResponse || isSubmitting) {
      return;
    }

    const responsePayload = RESPONSE_TO_SUBMISSION[selectedResponse];
    setIsSubmitting(true);

    try {
      await onSubmit({
        pageId,
        rating: responsePayload.rating,
        thumbs: responsePayload.thumbs,
        comment: (comment || '').trim(),
        timestamp: new Date().toISOString(),
      });

      localStorage.setItem(storageKey, SURVEY_STATUS.COMPLETED);
      setSurveyStatus(SURVEY_STATUS.COMPLETED);
      modalRef.current?.toggleModal(false);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to submit feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (surveyStatus === SURVEY_STATUS.COMPLETED) {
    return null;
  }

  if (surveyStatus !== 'ready') {
    return null;
  }

  return (
    <>
      <ModalToggleButton
        opener
        modalRef={modalRef}
        type="button"
        className={`usa-button survey-feedback__trigger-button ${showPulse ? 'survey-feedback__trigger-button--pulse' : ''} position-fixed right-2 bottom-2 margin-0`}
      >
        Was this page helpful?
      </ModalToggleButton>

      <Modal
        ref={modalRef}
        id={`survey-feedback-modal-${pageId}`}
        aria-labelledby={`survey-feedback-modal-heading-${pageId}`}
        aria-describedby={`survey-feedback-modal-description-${pageId}`}
        className="survey-feedback__modal"
      >
        <ModalHeading id={`survey-feedback-modal-heading-${pageId}`}>
          How did we do?
        </ModalHeading>

        <div id={`survey-feedback-modal-description-${pageId}`}>
          <p className="margin-top-0 margin-bottom-2 font-sans-sm">
            Select &quot;Yes&quot; or &quot;No.&quot; Add additional comments if you would like to, then select
            {' '}
            &quot;Submit.&quot;
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
              <Label htmlFor={`feedback-comment-${pageId}`} className="margin-top-0">
                Optional Comments
              </Label>
              <p className="margin-top-1 margin-bottom-1 font-sans-xs text-base-dark">
                Want to tell us more? Please do not put Personal Identifiable Information (PII) in this field.
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

            <Button type="submit" disabled={!selectedResponse || isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </Button>
          </form>
        </div>
      </Modal>
    </>
  );
}

FeedbackSurvey.propTypes = {
  pageId: PropTypes.string.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export default FeedbackSurvey;
