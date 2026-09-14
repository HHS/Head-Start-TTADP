import React from 'react';
import FilterSelect from './FilterSelect';
import { filterSelectProps } from './props';

const ROLES_MAP = [
  {
    selectValue: 1,
    value: 'Early Childhood Manager',
    label: 'Early Childhood Manager (ECM)',
  },
  {
    selectValue: 2,
    value: 'Early Childhood Specialist',
    label: 'Early Childhood Specialist (ECS)',
  },
  {
    selectValue: 3,
    value: 'Family Engagement Specialist',
    label: 'Family Engagement Specialist (FES)',
  },
  {
    selectValue: 4,
    value: 'Grantee Specialist',
    label: 'Grantee Specialist (GS)',
  },
  {
    selectValue: 5,
    value: 'Grantee Specialist Manager',
    label: 'Grantee Specialist Manager (GSM)',
  },
  {
    selectValue: 6,
    value: 'Health Specialist',
    label: 'Health Specialist (HS)',
  },
  {
    selectValue: 7,
    value: 'System Specialist',
    label: 'System Specialist (SS)',
  },
  {
    selectValue: 8,
    value: 'TTAC',
    label: 'TTAC',
  },
];

const ROLE_OPTIONS = ROLES_MAP.map(({ label, selectValue: value }) => ({ value, label }));

export default function FilterSpecialistSelect({ onApply, inputId, query }) {
  const onApplyClick = (selected) => {
    onApply(selected.map((selection) => ROLES_MAP.find((role) => role.label === selection).value));
  };

  // this is because we have a label that doesn't match the backend
  // value (i.e., the abbreviations appended at the end of the title aren't the values,
  // in our backend. so for this particular filter we need to maintain a special case
  const selectedValues = query
    .map((selection) => {
      const role = ROLES_MAP.find((r) => r.value === selection);
      if (role) {
        return role.label;
      }

      return null;
    })
    .filter((r) => r);

  return (
    <FilterSelect
      onApply={onApplyClick}
      inputId={inputId}
      labelText="Select specialist role to filter by"
      options={ROLE_OPTIONS}
      selectedValues={selectedValues}
    />
  );
}

FilterSpecialistSelect.propTypes = filterSelectProps;
