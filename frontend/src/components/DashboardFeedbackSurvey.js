import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  Button, Textarea, Label, Fieldset,
} from '@trussworks/react-uswds';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';
import './DashboardFeedbackSurvey.scss';

const RATING_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const MAX_COMMENT_LENGTH = 300;
const SURVEY_STATUS = {
  COLLAPSED: 'collapsed',
  COMPLETED: 'completed',
  OPEN: 'open',
};

function DashboardFeedbackSurvey({ pageId, onSubmit }) {
  const storageKey = `dashboard-feedback-dismissed-${pageId}`;
  const [surveyStatus, setSurveyStatus] = useState(SURVEY_STATUS.OPEN);
  const [selectedRating, setSelectedRating] = useState(null);
  const [comment, setComment] = useState('');
  const [isCommentExpanded, setIsCommentExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    setIsSubmitting(true);
    try {
      await onSubmit({
        pageId,
        rating: selectedRating,
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

  if (surveyStatus === SURVEY_STATUS.COMPLETED) {
    return null;
  }

  if (surveyStatus === SURVEY_STATUS.COLLAPSED) {
    return (
      <button
        type="button"
        className="dashboard-feedback-survey__reopen-button"
        onClick={handleReopen}
        aria-label="Reopen survey"
        data-tooltip="Expand survey"
      >
        <FontAwesomeIcon icon={faChevronUp} />
      </button>
    );
  }

  return (
    <div className="dashboard-feedback-survey" role="complementary" aria-label="Dashboard feedback survey">
      <div className="dashboard-feedback-survey__header">
        <h3 className="dashboard-feedback-survey__title">How useful is this dashboard page?</h3>
        <button
          type="button"
          className="dashboard-feedback-survey__close-button"
          onClick={handleDismiss}
          aria-label="Dismiss survey"
        >
          <FontAwesomeIcon icon={faTimes} />
        </button>
      </div>

      <Fieldset legend="Rate this page" legendStyle="srOnly">
        <div className="dashboard-feedback-survey__rating-scale">
          <span className="dashboard-feedback-survey__scale-label">Not useful</span>
          <div className="dashboard-feedback-survey__rating-options">
            {RATING_OPTIONS.map((rating) => (
              <div key={rating} className="dashboard-feedback-survey__rating-option">
                <input
                  type="radio"
                  id={`rating-${rating}-${pageId}`}
                  name={`dashboard-rating-${pageId}`}
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
          <span className="dashboard-feedback-survey__scale-label">Very useful</span>
        </div>
      </Fieldset>

      <div className="dashboard-feedback-survey__comment-section">
        <button
          type="button"
          className="dashboard-feedback-survey__expand-button"
          onClick={() => setIsCommentExpanded(!isCommentExpanded)}
          aria-expanded={isCommentExpanded}
        >
          <FontAwesomeIcon icon={isCommentExpanded ? faChevronUp : faChevronDown} />
          {' '}
          {isCommentExpanded ? 'Hide' : 'Add'}
          {' '}
          additional comments
        </button>

        {isCommentExpanded && (
          <div className="dashboard-feedback-survey__textarea-container">
            <Label htmlFor={`feedback-comment-${pageId}`}>
              Additional comments (optional)
            </Label>
            <Textarea
              id={`feedback-comment-${pageId}`}
              name="feedback-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={MAX_COMMENT_LENGTH}
              aria-describedby={`char-count-${pageId}`}
            />
            <div id={`char-count-${pageId}`} className="dashboard-feedback-survey__char-count">
              {comment.length}
              /
              {MAX_COMMENT_LENGTH}
              {' '}
              characters
            </div>
          </div>
        )}
      </div>

      <div className="dashboard-feedback-survey__actions">
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={!selectedRating || isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Submit feedback'}
        </Button>
      </div>
    </div>
  );
}

DashboardFeedbackSurvey.propTypes = {
  pageId: PropTypes.string.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

export default DashboardFeedbackSurvey;
