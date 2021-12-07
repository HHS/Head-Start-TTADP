import React from 'react';
import PropTypes from 'prop-types';
import SpecialistSelect from '../SpecialistSelect';

export default function FilterSpecialistSelect({
  labelId,
  onApplyRoles,
  query,
}) {
  const onChange = (values) => onApplyRoles(values);

  return (
    <SpecialistSelect
      onChange={onChange}
      labelId={labelId}
      onApplyRoles={onApplyRoles}
      toggleAllInitial={false}
      hideToggleAll
      previousValue={query}
    />
  );
}

FilterSpecialistSelect.propTypes = {
  labelId: PropTypes.string.isRequired,
  onApplyRoles: PropTypes.func.isRequired,
  query: PropTypes.oneOfType([PropTypes.string, PropTypes.arrayOf(PropTypes.string)]),
};

FilterSpecialistSelect.defaultProps = {
  query: [],
};
