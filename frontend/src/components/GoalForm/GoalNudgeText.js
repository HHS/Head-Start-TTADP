import React from 'react';
import PropTypes from 'prop-types';
import {
  FormGroup,
  Label,
  Textarea,
} from '@trussworks/react-uswds';
import Req from '../Req';
import { SimilarGoalProp } from './SimilarGoal';
import SimilarGoals from './SimilarGoals';
import { dismissOnNoMatch } from './constants';

export default function GoalNudgeText({
  error,
  inputName,
  validateGoalName,
  goalName,
  onChange,
  isLoading,
  similar,
  onSelectNudgedGoal,
  setDismissSimilar,
  useOhsInitiativeGoal,
}) {
  if (useOhsInitiativeGoal) {
    return null;
  }

  return (
    <FormGroup error={error.props.children} className="position-relative">
      <Label htmlFor={inputName}>
        Recipient&apos;s goal
        {' '}
        <Req />
      </Label>
      <span className="usa-hint">
        Get goal suggestions while you type
      </span>
      <>
        {error}
        <Textarea
          onBlur={(e) => {
            if (similar.length) {
              dismissOnNoMatch(e, '.ttahub-goal-nudge--container *', setDismissSimilar);
            }
            validateGoalName();
          }}
          id={inputName}
          name={inputName}
          value={goalName}
          onChange={onChange}
          required
          disabled={isLoading}
          style={{ height: '80px' }}
        />
        <SimilarGoals
          similar={similar}
          setDismissSimilar={setDismissSimilar}
          onSelectNudgedGoal={onSelectNudgedGoal}
        />
      </>
    </FormGroup>
  );
}

GoalNudgeText.propTypes = {
  error: PropTypes.node.isRequired,
  inputName: PropTypes.string.isRequired,
  validateGoalName: PropTypes.func.isRequired,
  goalName: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  isLoading: PropTypes.bool.isRequired,
  similar: PropTypes.arrayOf(SimilarGoalProp).isRequired,
  onSelectNudgedGoal: PropTypes.func.isRequired,
  setDismissSimilar: PropTypes.func.isRequired,
  useOhsInitiativeGoal: PropTypes.bool.isRequired,
};
