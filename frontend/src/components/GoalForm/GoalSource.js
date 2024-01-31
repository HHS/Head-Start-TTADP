import React from 'react';
import { v4 as uuid } from 'uuid';
import PropTypes from 'prop-types';
import {
  Dropdown,
  FormGroup, Label,
} from '@trussworks/react-uswds';
import { GOAL_SOURCES } from '@ttahub/common';
import Req from '../Req';

export default function GoalSource({
  error,
  source,
  validateGoalSource,
  onChangeGoalSource,
  goalStatus,
  inputName,
  isLoading,
  isCurated,
  userCanEdit,
  isMultiRecipientGoal,
  required,
}) {
  const readOnly = goalStatus === 'Closed' || !userCanEdit || isCurated;

  if ((readOnly && !source) || isMultiRecipientGoal) {
    return null;
  }
  if (readOnly && source) {
    return (
      <>
        <p className="usa-prose text-bold margin-bottom-0">
          Goal source
        </p>
        <p className="usa-prose margin-0">{source}</p>
      </>
    );
  }

  const onChange = (evt) => {
    const { value } = evt.target;
    onChangeGoalSource(value);
  };

  return (
    <>
      <FormGroup error={error.props.children}>
        <Label htmlFor={inputName}>
          <>
            Goal source
            {' '}
            {required && (<Req />)}
          </>
        </Label>
        {error}
        <Dropdown
          id={inputName}
          name={inputName}
          onChange={onChange}
          onBlur={() => {
            validateGoalSource();
          }}
          disabled={isLoading}
          value={source}
          required={required}
        >
          <option value="" disabled selected hidden>- Select -</option>
          {GOAL_SOURCES.map((s) => (
            <option key={uuid()}>{s}</option>
          ))}
        </Dropdown>

      </FormGroup>
    </>
  );
}

GoalSource.propTypes = {
  error: PropTypes.node.isRequired,
  source: PropTypes.string.isRequired,
  validateGoalSource: PropTypes.func.isRequired,
  onChangeGoalSource: PropTypes.func.isRequired,
  inputName: PropTypes.string,
  isLoading: PropTypes.bool,
  goalStatus: PropTypes.string.isRequired,
  userCanEdit: PropTypes.bool.isRequired,
  isMultiRecipientGoal: PropTypes.bool,
  isCurated: PropTypes.bool,
  required: PropTypes.bool,
};

GoalSource.defaultProps = {
  inputName: 'goal-source',
  isLoading: false,
  isMultiRecipientGoal: false,
  isCurated: false,
  required: true,
};
