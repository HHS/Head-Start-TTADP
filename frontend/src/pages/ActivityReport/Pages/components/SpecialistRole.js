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

  const roles = [...collaborators, author].map(({ role }) => role);

  const options = [...new Set(roles)].map((role) => ({
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
        name={inputName}
        inputId={inputName}
        options={options}
        value={selectedRoles}
        onBlur={validateSpecialistRole}
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
