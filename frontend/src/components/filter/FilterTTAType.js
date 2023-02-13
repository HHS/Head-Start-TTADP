import React from 'react';
import PropTypes from 'prop-types';
import { Dropdown } from '@trussworks/react-uswds';

export function displayTtaTypeQuery(q) {
  if (q === 'training') {
    return 'Training';
  }

  if (q === 'technical-assistance') {
    return 'Technical assistance';
  }

  if (q === 'training,technical-assistance') {
    return 'Training and technical assistance';
  }

  return '';
}

export default function FilterTTAType({ onApply, query, inputId }) {
  const onApplyTTAType = (e) => {
    const { target: { value } } = e;
    onApply(value);
  };

  return (
    <>
      { /* eslint-disable-next-line jsx-a11y/label-has-associated-control */ }
      <label className="sr-only" htmlFor={inputId}>Select tta type to filter by</label>
      <Dropdown name={inputId} id={inputId} value={query} onChange={onApplyTTAType}>
        <option value="training">
          Training
        </option>
        <option value="technical-assistance">
          Technical assistance
        </option>
        <option value="training,technical-assistance">
        Training and technical assistance
        </option>
      </Dropdown>
    </>
  );
}

FilterTTAType.propTypes = {
  onApply: PropTypes.func.isRequired,
  query: PropTypes.string.isRequired,
  inputId: PropTypes.string,
};

FilterTTAType.defaultProps = {
  inputId: 'ttaTypeFilter',
};
