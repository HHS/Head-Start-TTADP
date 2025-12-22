import React from 'react';
import PropTypes from 'prop-types';
import { useController } from 'react-hook-form';
import { Dropdown } from '@trussworks/react-uswds';

function SingleApproverSelect({
  name,
  options,
}) {
  const {
    field: {
      onChange: onSelect,
      value: selectValue,
      onBlur: onBlurSelect,
    },
  } = useController({
    name,
    rules: {
      required: 'Select an approver',
    },
    defaultValue: null,
  });

  const onChange = (e) => {
    onSelect(Number(e.target.value));
  };

  return (
    <Dropdown
      id={name}
      name={name}
      data-testid="approver"
      value={String(selectValue || '')}
      onChange={onChange}
      onBlur={onBlurSelect}
      required
    >
      <option value="">Select an approver</option>
      {options.map((approver) => (
        <option key={approver.id} value={String(approver.id)}>{approver.fullName}</option>
      ))}
    </Dropdown>
  );
}

const value = PropTypes.oneOfType([
  PropTypes.string,
  PropTypes.number,
]);

SingleApproverSelect.propTypes = {
  name: PropTypes.string.isRequired,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value,
      options: PropTypes.arrayOf(
        PropTypes.shape({
          label: PropTypes.string.isRequired,
          value: value.isRequired,
        }),
      ),
      label: PropTypes.string.isRequired,
    }),
  ).isRequired,
};

export default SingleApproverSelect;
