import React, { useMemo } from 'react';
import { v4 as uuid } from 'uuid';
import PropTypes from 'prop-types';
import {
  FormGroup, Label,
} from '@trussworks/react-uswds';
import { GOAL_SOURCES } from '@ttahub/common';
import Select from 'react-select';
import selectOptionsReset from '../selectOptionsReset';
import Req from '../Req';

export default function GoalSource({
  error,
  sources,
  validateGoalSource,
  onChangeGoalSource,
  goalStatus,
  inputName,
  isLoading,
  userCanEdit,
  isMultiRecipientGoal,
}) {
  const readOnly = useMemo(() => goalStatus === 'Closed' || !userCanEdit,
    [goalStatus, userCanEdit]);

  if ((readOnly && !sources.length) || isMultiRecipientGoal) {
    return null;
  }
  if (readOnly && sources.length) {
    return (
      <>
        <p className="usa-prose text-bold margin-bottom-0">
          Goal source
        </p>
        <ul className="usa-list usa-list--unstyled">
          {sources.map((source) => (
            <li key={uuid()}>
              {source}
            </li>
          ))}
        </ul>
      </>
    );
  }

  const options = GOAL_SOURCES.map((label, value) => ({ label, value }));
  const onChange = (selectedOptions) => {
    const selectedSources = selectedOptions.map((option) => option.label);
    onChangeGoalSource(selectedSources);
  };

  const value = options.filter((source) => sources.includes(source.label))
    .sort((a, b) => a.label - b.label);

  return (
    <>
      <FormGroup error={error.props.children}>
        <Label htmlFor={inputName}>
          <>
            Goal source
            {' '}
            <Req />
          </>
        </Label>
        {error}
        <Select
          inputName={inputName}
          inputId={inputName}
          name={inputName}
          styles={selectOptionsReset}
          components={{
            DropdownIndicator: null,
          }}
          className="usa-select"
          isMulti
          options={options}
          onBlur={validateGoalSource}
          value={value}
          onChange={onChange}
          closeMenuOnSelect={false}
          isDisabled={isLoading}
        />
      </FormGroup>
    </>
  );
}

GoalSource.propTypes = {
  error: PropTypes.node.isRequired,
  sources: PropTypes.arrayOf(PropTypes.string).isRequired,
  validateGoalSource: PropTypes.func.isRequired,
  onChangeGoalSource: PropTypes.func.isRequired,
  inputName: PropTypes.string,
  isLoading: PropTypes.bool,
  goalStatus: PropTypes.string.isRequired,
  userCanEdit: PropTypes.bool.isRequired,
  isMultiRecipientGoal: PropTypes.bool,
};

GoalSource.defaultProps = {
  inputName: 'goal-source',
  isLoading: false,
  isMultiRecipientGoal: false,
};
