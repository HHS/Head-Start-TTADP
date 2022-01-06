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

export default function SpecialistSelect({
  onApplyRoles,
  labelId,
  hideToggleAll,
  toggleAllInitial,
  onChange,
}) {
  const getRoleValues = (selected) => {
    const roleValues = selected.map((s) => parseInt(s, 10));

    return ROLES_MAP.filter(
      (role) => roleValues.includes(role.selectValue),
    ).map((role) => role.value);
  };

  const onCheckboxChange = (selected) => {
    const values = getRoleValues(selected);
    onChange(values);
  };

  const onApply = (selected) => {
    onApplyRoles(getRoleValues(selected));
  };

  return (
    <CheckboxSelect
      onChange={onCheckboxChange}
      onApplyQuery={onApply}
      styleAsSelect
      hideToggleAll={hideToggleAll}
      toggleAllText="All Specialists"
      toggleAllInitial={toggleAllInitial}
      labelId={labelId}
      labelText="Filter by specialists"
      ariaName="Change filter by specialists menu"
      onApply={onApply}
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
  labelId: PropTypes.string.isRequired,
  onApplyRoles: PropTypes.func.isRequired,
  toggleAllInitial: PropTypes.bool,
  hideToggleAll: PropTypes.bool,
  onChange: PropTypes.func,
};

SpecialistSelect.defaultProps = {
  toggleAllInitial: true,
  hideToggleAll: false,
  onChange: () => {},
};
