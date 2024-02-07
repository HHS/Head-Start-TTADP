import React, { useState } from 'react';
import { uniqueId } from 'lodash';
import PropTypes from 'prop-types';
import {
  FormGroup,
  Dropdown,
  Label,
} from '@trussworks/react-uswds';
import Req from '../Req';

export default function GoalNudgeInitiativePicker({
  error,
  useOhsInitiativeGoal,
  validateGoalName,
  goalTemplates,
}) {
  const [selection, setSelection] = useState('');

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
      <Dropdown
        id="goal-template"
        name="goal-template"
        label="Goal template"
        onChange={(e) => {
          setSelection(e.target.value);
        }}
        onBlur={() => validateGoalName()}
        value={selection}
      >
        <option name="default" disabled hidden value="">- Select -</option>
        {(goalTemplates || []).map((template) => (
          <option key={uniqueId('template-option-')} value={template.id}>
            {template.name}
          </option>
        ))}
      </Dropdown>

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
};
