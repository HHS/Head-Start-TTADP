import React from 'react';
import PropTypes from 'prop-types';
import FilterSelect from './FilterSelect';

const ROLES_MAP = [
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

const ROLE_OPTIONS = ROLES_MAP.map(({ label, selectValue: value }) => ({ value, label }));

export default function FilterSpecialistSelect({
  onApply,
  inputId,
}) {
  const onApplyClick = (selected) => {
    onApply(
      selected.map((selection) => ROLES_MAP.find((role) => role.label === selection).value),
    );
  };

  return (
    <FilterSelect
      onApply={onApplyClick}
      inputId={inputId}
      labelText="Select specialist role to filter by"
      options={ROLE_OPTIONS}
    />
  );
}

FilterSpecialistSelect.propTypes = {
  inputId: PropTypes.string.isRequired,
  onApply: PropTypes.func.isRequired,
};
