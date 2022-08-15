import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import { Label } from '@trussworks/react-uswds';
import Select from 'react-select';
import Req from '../Req';
import selectOptionsReset from '../selectOptionsReset';

export default function SpecialistRole({
  error,
  onChange,
  selectedRoles,
  inputName,
  validateSpecialistRole,
  options,
  status,
  isOnApprovedReport,
  isOnReport,
  isLoading,
}) {
  // we want the *initial* selection stored in a safe place
  // so that the form field doesn't suddenly go read-only
  const initialSelection = useRef(selectedRoles.length);

  const readOnly = isOnApprovedReport || status === 'Suspended' || (status === 'Not Started' && isOnReport);

  if (readOnly && initialSelection.current) {
    return (
      <>
        <p className="usa-prose text-bold margin-bottom-1">
          Specialist roles
        </p>
        <ul className="usa-list usa-list--unstyled">
          {selectedRoles.map((role) => (<li key={role}>{role}</li>))}
        </ul>
      </>
    );
  }

  // format them in a way react select can understand
  const roleOptions = options.map((role) => ({
    label: role,
    value: role,
  }));

  const selected = selectedRoles.map((role) => ({
    label: role,
    value: role,
  }));

  const onSelect = (selection) => {
    onChange(selection.map(({ value }) => value));
  };

  // build our selector
  return (
    <Label>
      Specialist roles providing TTA
      {' '}
      <Req />
      {error}
      <Select
        onChange={onSelect}
        styles={selectOptionsReset}
        className="usa-select"
        name={inputName}
        inputId={inputName}
        options={roleOptions}
        value={selected}
        onBlur={validateSpecialistRole}
        closeMenuOnSelect={false}
        isMulti
        isDisabled={isLoading}
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
  options: PropTypes.arrayOf(PropTypes.string).isRequired,
  status: PropTypes.string.isRequired,
  isOnApprovedReport: PropTypes.bool.isRequired,
  isOnReport: PropTypes.bool.isRequired,
  isLoading: PropTypes.bool,
};

SpecialistRole.defaultProps = {
  selectedRoles: [],
  inputName: 'objectiveRoles',
  isLoading: false,
};
