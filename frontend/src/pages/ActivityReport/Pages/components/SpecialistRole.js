import React from 'react';
import PropTypes from 'prop-types';
import { Label } from '@trussworks/react-uswds';
import Select from 'react-select';
import { useWatch } from 'react-hook-form/dist/index.ie11';
import Req from '../../../../components/Req';
import selectOptionsReset from '../../../../components/selectOptionsReset';

export default function SpecialistRole({
  error,
  onChange,
  selectedRoles,
  inputName,
  validateSpecialistRole,
}) {
  // we need to figure out our options based on author/collaborator roles
  const collaborators = useWatch({ name: 'collaborators' });
  const author = useWatch({ name: 'author' });

  // create an exclusive set of roles
  // from the collaborators & author
  const roles = Array.from(
    new Set(
      [...collaborators, author].map(({ role }) => role).flat(),
    ),
  );

  // format them in a way react select can understand
  const options = roles.map((role) => ({
    label: role,
    value: role,
  }));

  // if there is only one option, we just set the objectives to be
  // that value without any UI
  // if (options.length === 1) {
  //   return (
  //     <input type="hidden" name={inputName} value={selectedRoles} />
  //   );
  // }

  // build our selector
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
        name={inputName}
        inputId={inputName}
        options={options}
        value={selectedRoles}
        onBlur={validateSpecialistRole}
        closeMenuOnSelect={false}
        isMulti
      />
    </Label>
  );
}

SpecialistRole.propTypes = {
  error: PropTypes.node.isRequired,
  onChange: PropTypes.func.isRequired,
  selectedRoles: PropTypes.arrayOf(PropTypes.string),
  inputName: PropTypes.string,
  validateSpecialistRole: PropTypes.func.isRequired,
};

SpecialistRole.defaultProps = {
  selectedRoles: [],
  inputName: 'objectiveRoles',
};
