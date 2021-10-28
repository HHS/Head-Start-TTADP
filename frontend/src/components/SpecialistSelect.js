import React from 'react';
import PropTypes from 'prop-types';
import CheckboxSelect from './CheckboxSelect';

export const ROLES_MAP = [
  {
    selectValue: 1,
    value: 'Early Childhood Specialist',
    label: 'Early Childhood Specialist (ECS)',
  },
  {
    selectValue: 2,
    value: 'Family Engagement Specialist',
    label: 'Family Engagement Specialist (FES)',
  },
  {
    selectValue: 3,
    value: 'Grantee Specialist',
    label: 'Grantee Specialist (GS)',
  },
  {
    selectValue: 4,
    value: 'Health Specialist',
    label: 'Health Specialist (HS)',
  },
  {
    selectValue: 5,
    value: 'System Specialist',
    label: 'System Specialist (SS)',
  },
];

export default function SpecialistSelect({ onApplyRoles }) {
  return (
    <CheckboxSelect
      styleAsSelect
      toggleAllText="All Specialists"
      toggleAllInitial
      labelId="tfRoleFilter"
      labelText="Filter by specialists"
      ariaName="Change filter by specialists menu"
      onApply={onApplyRoles}
      options={
        ROLES_MAP.map((role) => ({
          value: role.selectValue,
          label: role.label,
        }))
      }
    />
  );
}

SpecialistSelect.propTypes = {
  onApplyRoles: PropTypes.func.isRequired,
};
