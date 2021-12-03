import React from 'react';
import PropTypes from 'prop-types';
import CheckboxSelect from '../CheckboxSelect';
import { REASONS } from '../../Constants';

const REASONS_OPTIONS = REASONS.map((label, value) => ({ value, label }));

export default function FilterReasonSelect({
  onApply, labelId,
}) {
  const onApplyClick = (selected) => {
    const reasonValues = selected.map((s) => parseInt(s, 10));

    const reasons = REASONS_OPTIONS.filter(
      (reason) => reasonValues.includes(reason.value),
    ).map((reason) => reason.label);

    onApply(reasons);
  };

  return (
    <CheckboxSelect
      styleAsSelect
      hideToggleAll
      toggleAllText="All Reasons"
      toggleAllInitial={false}
      labelId={labelId}
      labelText="Filter by reasons"
      ariaName="Change filter by reasons menu"
      onApply={onApplyClick}
      options={REASONS_OPTIONS}
    />
  );
}

FilterReasonSelect.propTypes = {
  labelId: PropTypes.string.isRequired,
  onApply: PropTypes.func.isRequired,
};
