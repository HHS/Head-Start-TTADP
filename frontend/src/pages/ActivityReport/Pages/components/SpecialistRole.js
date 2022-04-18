import React from 'react';
import PropTypes from 'prop-types';
import { Label } from '@trussworks/react-uswds';
import Select from 'react-select';
import { useFormContext, useWatch } from 'react-hook-form/dist/index.ie11';
import Req from '../../../../components/Req';
import selectOptionsReset from '../../../../components/selectOptionsReset';

export default function SpecialistRole({ objective }) {
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

  return (
    <Label>
      Specialist role
      {' '}
      <Req />
      <Select
        onChange={onChange}
        styles={selectOptionsReset}
        className="usa-select"
        name={`objective-${objective.value}-roles`}
        options={options}
        isMulti
      />
    </Label>
  );
}

const OBJECTIVE_PROP = PropTypes.shape({
  label: PropTypes.string,
  value: PropTypes.number,
});

SpecialistRole.propTypes = {
  objective: OBJECTIVE_PROP.isRequired,
};
