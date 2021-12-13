import React from 'react';
import PropTypes from 'prop-types';
import FilterSelect from './FilterSelect';
import { ROLES_MAP } from '../SpecialistSelect';

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
