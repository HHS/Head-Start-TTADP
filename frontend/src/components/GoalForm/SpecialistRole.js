import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import { Label } from '@trussworks/react-uswds';
import Select from 'react-select';
import Req from '../Req';
import selectOptionsReset from '../selectOptionsReset';
import UnusedData from './UnusedData';

export default function SpecialistRole({
  error,
  onChange,
  selectedRoles,
  inputName,
  validateSpecialistRole,
  status,
  isOnApprovedReport,
  isOnReport,
  isLoading,
  roleOptions,
}) {
  const initialSelectedRolesLength = useRef(selectedRoles.length);

  const readOnly = isOnApprovedReport || status === 'Suspended' || (status === 'Not Started' && isOnReport);

  if (readOnly && initialSelectedRolesLength.current) {
    return (
      <>
        <p className="usa-prose text-bold margin-bottom-0">
          Specialist roles
        </p>
        <ul className="usa-list usa-list--unstyled">
          {selectedRoles.map((role) => (<li key={role.id}>{role.fullName}</li>))}
        </ul>
      </>
    );
  }

  const onSelect = (selection) => {
    onChange(selection);
  };

  const { editableRoles, fixedRoles } = selectedRoles.reduce((acc, role) => {
    if (role.isOnApprovedReport) {
      acc.fixedRoles.push(role);
    } else {
      acc.editableRoles.push(role);
    }

    return acc;
  }, { editableRoles: [], fixedRoles: [] });

  const savedRoleName = fixedRoles ? fixedRoles.map(({ fullName }) => fullName) : [];
  const filteredOptions = roleOptions.filter((option) => !savedRoleName.includes(option.fullName));

  return (
    <>
      { fixedRoles && fixedRoles.length
        ? (
          <>
            <p className="usa-prose margin-bottom-0 text-bold">Specialist roles</p>
            <ul className="usa-list usa-list--unstyled">
              {fixedRoles.map((role) => (<li key={role.fullName}>{role.fullName}</li>))}
              {isOnApprovedReport
                ? editableRoles.map((role) => (
                  <UnusedData key={role.fullName} value={role.fullName} />
                ))
                : null}
            </ul>
          </>
        )
        : null}
      { !isOnApprovedReport ? (
        <Label>
          { fixedRoles.length ? <>Add more specialist roles</>
            : (
              <>
                Specialist roles providing TTA
                {' '}
                <Req />
              </>
            )}
          {error}
          <Select
            onChange={onSelect}
            styles={selectOptionsReset}
            className="usa-select"
            name={inputName}
            inputId={inputName}
            options={filteredOptions}
            value={editableRoles}
            onBlur={validateSpecialistRole}
            closeMenuOnSelect={false}
            getOptionLabel={(option) => option.fullName}
            getOptionValue={(option) => option.id}
            isMulti
            isDisabled={isLoading}
          />
        </Label>
      ) : null }
    </>
  );
}

SpecialistRole.propTypes = {
  error: PropTypes.node.isRequired,
  onChange: PropTypes.func.isRequired,
  selectedRoles: PropTypes.arrayOf(PropTypes.string),
  inputName: PropTypes.string,
  validateSpecialistRole: PropTypes.func.isRequired,
  status: PropTypes.string.isRequired,
  isOnApprovedReport: PropTypes.bool.isRequired,
  isOnReport: PropTypes.bool.isRequired,
  isLoading: PropTypes.bool,
  roleOptions: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string,
    value: PropTypes.string,
  })).isRequired,
};

SpecialistRole.defaultProps = {
  selectedRoles: [],
  inputName: 'objectiveRoles',
  isLoading: false,
};
