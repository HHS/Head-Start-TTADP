import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import {
  Button, Textarea, Label, Fieldset,
} from '@trussworks/react-uswds';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes,
  faChevronDown,
  faChevronUp,
  faThumbsUp,
  faThumbsDown,
} from '@fortawesome/free-solid-svg-icons';
import './FeedbackSurvey.scss';

const RATING_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const MAX_COMMENT_LENGTH = 300;
const SURVEY_STATUS = {
  COLLAPSED: 'collapsed',
  COMPLETED: 'completed',
  OPEN: 'open',
};

const THUMBS_RATINGS = {
  DOWN: 1,
  UP: 10,
};

function FeedbackSurvey({ pageId, onSubmit, useThumbRating }) {
  const storageKey = `survey-feedback-dismissed-${pageId}`;
  const [surveyStatus, setSurveyStatus] = useState(SURVEY_STATUS.OPEN);
  const [selectedRating, setSelectedRating] = useState(null);
  const [comment, setComment] = useState('');
  const [isCommentExpanded, setIsCommentExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const commentInputRef = useRef(null);

  useEffect(() => {
    const dismissed = localStorage.getItem(storageKey);
    if (dismissed === SURVEY_STATUS.COMPLETED) {
      setSurveyStatus(SURVEY_STATUS.COMPLETED);
      return;
    }

    // Backward compatibility: legacy "true" means hidden, now treated as collapsed.
    if (dismissed === SURVEY_STATUS.COLLAPSED || dismissed === 'true') {
      setSurveyStatus(SURVEY_STATUS.COLLAPSED);
    }
  }, [storageKey]);

  const handleDismiss = () => {
    localStorage.setItem(storageKey, SURVEY_STATUS.COLLAPSED);
    setSurveyStatus(SURVEY_STATUS.COLLAPSED);
  };

  const handleReopen = () => {
    localStorage.removeItem(storageKey);
    setSurveyStatus(SURVEY_STATUS.OPEN);
  };

  const handleSubmit = async () => {
    if (!selectedRating) return;

    const surveyType = useThumbRating ? 'thumbs' : 'scale';
    let thumbs = null;
    if (useThumbRating) {
      thumbs = selectedRating === THUMBS_RATINGS.UP ? 'up' : 'down';
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        pageId,
        rating: selectedRating,
        surveyType,
        thumbs,
        comment: comment.trim(),
        timestamp: new Date().toISOString(),
      });
      localStorage.setItem(storageKey, SURVEY_STATUS.COMPLETED);
      setSurveyStatus(SURVEY_STATUS.COMPLETED);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to submit feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isThumbsDownSelected = selectedRating === THUMBS_RATINGS.DOWN;
  const shouldShowCommentSection = useThumbRating ? !!selectedRating : isCommentExpanded;
  const isCommentRequired = useThumbRating && isThumbsDownSelected;
  const isSubmitDisabled = !selectedRating
    || isSubmitting
    || (isCommentRequired && !comment.trim());
  let commentLabel = 'Additional comments (optional)';
  if (useThumbRating) {
    commentLabel = isCommentRequired
      ? 'Tell us what we can do better:'
      : 'Tell us what you like about this page (optional):';
  }
  const title = useThumbRating ? 'How are we doing on this page?' : 'How useful is this page?';

  useEffect(() => {
    if (!useThumbRating || !selectedRating || !commentInputRef.current) {
      return;
    }

    if (typeof commentInputRef.current.scrollIntoView === 'function') {
      commentInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    if (isCommentRequired) {
      commentInputRef.current.focus();
    }
  }, [isCommentRequired, selectedRating, useThumbRating]);

  if (surveyStatus === SURVEY_STATUS.COMPLETED) {
    return null;
  }

  if (surveyStatus === SURVEY_STATUS.COLLAPSED) {
    const reopenTooltipId = `survey-feedback-reopen-tooltip-${pageId}`;

    return (
      <button
        type="button"
        className="survey-feedback__reopen-button position-fixed right-2 bottom-2 width-5 height-5 radius-pill display-flex flex-align-center flex-justify-center"
        onClick={handleReopen}
        aria-label="Reopen survey"
        aria-describedby={reopenTooltipId}
      >
        <FontAwesomeIcon icon={faChevronUp} />
        <span id={reopenTooltipId} role="tooltip" className="survey-feedback__reopen-tooltip">
          Expand survey
        </span>
      </button>
    );
  }

  return (
    <div className="survey-feedback padding-3 tablet:padding-x-6" role="complementary" aria-label="Survey feedback">
      <div className="display-flex flex-justify flex-align-start margin-bottom-2">
        <h3 className="margin-0 font-sans-lg text-bold text-base-darkest">{title}</h3>
        <button
          type="button"
          className="survey-feedback__close-button"
          onClick={handleDismiss}
          aria-label="Dismiss survey"
        >
          <FontAwesomeIcon icon={faTimes} />
        </button>
      </div>

      <Fieldset legend="Rate this page" legendStyle="srOnly">
        {useThumbRating ? (
          <div className="display-flex flex-gap-2 margin-bottom-2" role="radiogroup" aria-label="Rate this page">
            <button
              type="button"
              className={`survey-feedback__thumb-button display-inline-flex flex-align-center flex-justify-center width-5 height-5 ${selectedRating === THUMBS_RATINGS.UP ? 'is-selected' : ''}`}
              onClick={() => setSelectedRating(THUMBS_RATINGS.UP)}
              aria-pressed={selectedRating === THUMBS_RATINGS.UP}
              aria-label="Thumbs up"
            >
              <FontAwesomeIcon icon={faThumbsUp} />
            </button>
            <button
              type="button"
              className={`survey-feedback__thumb-button display-inline-flex flex-align-center flex-justify-center width-5 height-5 ${selectedRating === THUMBS_RATINGS.DOWN ? 'is-selected' : ''}`}
              onClick={() => setSelectedRating(THUMBS_RATINGS.DOWN)}
              aria-pressed={selectedRating === THUMBS_RATINGS.DOWN}
              aria-label="Thumbs down"
            >
              <FontAwesomeIcon icon={faThumbsDown} />
            </button>
          </div>
        ) : (
          <div className="display-flex flex-align-center flex-wrap flex-gap-1 margin-bottom-2 survey-feedback__rating-scale">
            <span className="font-sans-2xs text-base-dark text-bold">Not useful</span>
            <div className="display-flex flex-gap-1 flex-wrap">
              {RATING_OPTIONS.map((rating) => (
                <div key={rating} className="survey-feedback__rating-option display-flex flex-align-center">
                  <input
                    type="radio"
                    id={`rating-${rating}-${pageId}`}
                    name={`survey-rating-${pageId}`}
                    value={rating}
                    checked={selectedRating === rating}
                    onChange={() => setSelectedRating(rating)}
                    className="usa-radio__input"
                  />
                  <label
                    htmlFor={`rating-${rating}-${pageId}`}
                    className="usa-radio__label"
                  >
                    {rating}
                  </label>
                </div>
              ))}
            </div>
            <span className="font-sans-2xs text-base-dark text-bold">Very useful</span>
          </div>
        )}
      </Fieldset>

      <div className="margin-bottom-2">
        {!useThumbRating && (
          <button
            type="button"
            className="survey-feedback__expand-button display-flex flex-align-center flex-gap-1 font-sans-2xs"
            onClick={() => setIsCommentExpanded(!isCommentExpanded)}
            aria-expanded={isCommentExpanded}
          >
            <FontAwesomeIcon icon={isCommentExpanded ? faChevronUp : faChevronDown} />
            {' '}
            {isCommentExpanded ? 'Hide' : 'Add'}
            {' '}
            additional comments
          </button>
        )}

        {shouldShowCommentSection && (
          <div className="survey-feedback__textarea-container margin-top-2">
            <Label htmlFor={`feedback-comment-${pageId}`} className="font-sans-2xs margin-top-0">
              {commentLabel}
            </Label>
            <Textarea
              id={`feedback-comment-${pageId}`}
              name="feedback-comment"
              className="font-sans-2xs"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={MAX_COMMENT_LENGTH}
              required={isCommentRequired}
              inputRef={(el) => {
                commentInputRef.current = el;
              }}
              aria-describedby={`char-count-${pageId}`}
            />
            <div id={`char-count-${pageId}`} className="font-sans-3xs text-base margin-top-1 text-left">
              {comment.length}
              /
              {MAX_COMMENT_LENGTH}
              {' '}
              characters
            </div>
          </div>
        )}
      </div>

      <div className="display-flex flex-justify-start">
        <Button
          type="button"
          className="font-sans-2xs padding-y-1 padding-x-2"
          onClick={handleSubmit}
          disabled={isSubmitDisabled}
        >
          {isSubmitting ? 'Submitting...' : 'Submit feedback'}
        </Button>
      </div>
    </div>
  );
}

FeedbackSurvey.propTypes = {
  pageId: PropTypes.string.isRequired,
  onSubmit: PropTypes.func.isRequired,
  useThumbRating: PropTypes.bool,
};

FeedbackSurvey.defaultProps = {
  useThumbRating: false,
};

export default FeedbackSurvey;
