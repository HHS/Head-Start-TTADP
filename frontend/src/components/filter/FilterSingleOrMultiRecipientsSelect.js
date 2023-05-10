import React from 'react';
import PropTypes from 'prop-types';
import { Dropdown } from '@trussworks/react-uswds';

export function mapDisplayValue(value) {
  if (value === 'single-recipient') {
    return 'Single recipient';
  }

  if (value === 'multi-recipients') {
    return 'Multiple recipients';
  }

  return value;
}

export default function FilterSingleOrMultiRecipientsSelect({
  onApply,
  inputId,
  query,
}) {
  const onApplySingleOrMulti = (e) => {
    const { target: { value } } = e;
    onApply(value);
  };

  return (
    <>
      { /* eslint-disable-next-line jsx-a11y/label-has-associated-control */ }
      <label className="sr-only" htmlFor={inputId}>Select single or multiple recipients to filter by</label>
      <Dropdown name={inputId} id={inputId} value={query} onChange={onApplySingleOrMulti}>
        <option value="single-recipient">
          Single recipient
        </option>
        <option value="multi-recipients">
          Multiple recipients
        </option>
      </Dropdown>
    </>
  );
}

FilterSingleOrMultiRecipientsSelect.propTypes = {
  onApply: PropTypes.func.isRequired,
  query: PropTypes.string.isRequired,
  inputId: PropTypes.string,
};

FilterSingleOrMultiRecipientsSelect.defaultProps = {
  inputId: 'singleOrMultiRecipientsFilter',
};
