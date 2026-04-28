import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Button } from '@trussworks/react-uswds';
import {
  ALWAYS_SHOW_SURVEY_KEY,
  FORCE_SURVEY_SUBMIT_500_KEY,
  getFeedbackSurveyDebugFlag,
  setFeedbackSurveyDebugFlag,
} from '../utils/feedbackSurveyDebug';

export default function SurveyDebugControls({ onShowSurvey }) {
  const [throw500, setThrow500] = useState(false);

  useEffect(() => {
    setThrow500(getFeedbackSurveyDebugFlag(FORCE_SURVEY_SUBMIT_500_KEY));
  }, []);

  const handleShowSurvey = () => {
    setFeedbackSurveyDebugFlag(ALWAYS_SHOW_SURVEY_KEY, true);
    onShowSurvey();
  };

  const handleToggleThrow500 = () => {
    const nextValue = !throw500;
    setThrow500(nextValue);
    setFeedbackSurveyDebugFlag(FORCE_SURVEY_SUBMIT_500_KEY, nextValue);
  };

  return (
    <div className="display-flex flex-wrap flex-align-center margin-top-2 margin-bottom-2">
      <Button type="button" outline onClick={handleShowSurvey}>
        Show survey
      </Button>
      <Button
        type="button"
        className="margin-left-2"
        onClick={handleToggleThrow500}
      >
        {`Throw error: ${throw500 ? 'On' : 'Off'}`}
      </Button>
    </div>
  );
}

SurveyDebugControls.propTypes = {
  onShowSurvey: PropTypes.func,
};

SurveyDebugControls.defaultProps = {
  onShowSurvey: () => {},
};
