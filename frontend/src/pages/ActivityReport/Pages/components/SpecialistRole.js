import React from 'react';
import PropTypes from 'prop-types';
import { Label } from '@trussworks/react-uswds';
import Select from 'react-select';
import { useFormContext, useWatch } from 'react-hook-form/dist/index.ie11';
import Req from '../../../../components/Req';
import selectOptionsReset from '../../../../components/selectOptionsReset';
import { OBJECTIVE_PROP } from './constants';

export default function SpecialistRole({ objective, error, validateSpecialistRole }) {
  // we need to figure out our options based on author/collaborator roles
  const collaborators = useWatch({ name: 'collaborators' });
  const author = useWatch({ name: 'author' });
  const roles = [...collaborators, author].map(({ role }) => role);
  const options = [...new Set(roles)].map((role) => ({
    label: role,
    value: role,
  }));

  const objectiveRoles = useWatch({ name: 'objectiveRoles' });
  const { setValue } = useFormContext();

  const onChange = (selected) => {
    // copy of current state
    const copyOfObjectiveRoles = objectiveRoles ? objectiveRoles.map((o) => ({ ...o })) : [];

    // remove all current roles for this objective and then add the current selections in
    const newObjectiveRoles = [...copyOfObjectiveRoles.filter(
      (objectiveRole) => objectiveRole.objectiveId !== objective.value,
    ), ...selected.map((selection) => ({
      objectiveId: objective.value,
      role: selection.value,
    }))];

    // save our state
    setValue('objectiveRoles', newObjectiveRoles);
  };

  // get all the objective roles, filter for this objective
  // and format them in a way that react select can understand
  const selected = (objectiveRoles
    ? objectiveRoles.filter(({ objectiveId }) => objectiveId !== objective.value)
    : []).map(({ role }) => ({
    label: role,
    value: role,
  }));

  return (
    <Label>
      Specialist role
      {' '}
      <Req />
      {error}
      <Select
        onChange={onChange}
        styles={selectOptionsReset}
        className="usa-select"
        name={`objective-${objective.value}-roles`}
        options={options}
        value={selected}
        onBlur={validateSpecialistRole}
        isMulti
      />
    </Label>
  );
}

SpecialistRole.propTypes = {
  objective: OBJECTIVE_PROP.isRequired,
  error: PropTypes.node.isRequired,
  validateSpecialistRole: PropTypes.func.isRequired,
};
