import React, {
  useState,
  useEffect,
} from 'react';
import Select from 'react-select';
import PropTypes from 'prop-types';
import {
  FormGroup,
  Label,
} from '@trussworks/react-uswds';
import Req from '../Req';
import selectOptionsReset from '../selectOptionsReset';

export default function GoalNudgeInitiativePicker({
  error,
  useOhsInitiativeGoal,
  validateGoalName,
  goalTemplates,
  onSelectNudgedGoal,
}) {
  const [selection, setSelection] = useState('');

  useEffect(() => {
    // reset selection when useOhsInitiativeGoal is toggled
    // or if we don't have any valid goal templates
    if (!useOhsInitiativeGoal || !goalTemplates.length) {
      setSelection('');
    }
  }, [goalTemplates, useOhsInitiativeGoal]);

  if (!useOhsInitiativeGoal) {
    return null;
  }

  return (
    <FormGroup error={error.props.children}>
      <Label htmlFor="goal-template">
        Recipient&apos;s goal
        {' '}
        <Req />
      </Label>
      <Select
        inputId="goal-template"
        name="goal-template"
        className="usa-select"
        styles={selectOptionsReset}
        onChange={(updatedSelection) => {
          setSelection(updatedSelection);
          onSelectNudgedGoal(updatedSelection);
        }}
        options={goalTemplates || []}
        placeholder="- Select -"
        value={selection}
        getOptionLabel={(option) => option.name}
        getOptionValue={(option) => option.id}
        onBlur={() => validateGoalName()}
      />
    </FormGroup>
  );
}

GoalNudgeInitiativePicker.propTypes = {
  error: PropTypes.node.isRequired,
  validateGoalName: PropTypes.func.isRequired,
  goalTemplates: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
  })).isRequired,
  useOhsInitiativeGoal: PropTypes.bool.isRequired,
  onSelectNudgedGoal: PropTypes.func.isRequired,
};
