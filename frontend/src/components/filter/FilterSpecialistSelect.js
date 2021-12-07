import React from 'react';
import PropTypes from 'prop-types';
import SpecialistSelect from '../SpecialistSelect';

export default function FilterSpecialistSelect({
  labelId,
  onApplyRoles,
}) {
  const onChange = (values) => onApplyRoles(values);

  return (
    <SpecialistSelect
      onChange={onChange}
      labelId={labelId}
      onApplyRoles={onApplyRoles}
      toggleAllInitial={false}
      hideToggleAll
    />
  );
}

FilterSpecialistSelect.propTypes = {
  labelId: PropTypes.string.isRequired,
  onApplyRoles: PropTypes.func.isRequired,
};
