import React from 'react';
import PropTypes from 'prop-types';
import { Dropdown } from '@trussworks/react-uswds';

export default function FilterGoalType({ onApply, goalType }) {
  const onApplyGoalType = (e) => {
    const { target: { value } } = e;
    onApply(value);
  };

  return (
    <>
      { /* eslint-disable-next-line jsx-a11y/label-has-associated-control */ }
      <label className="sr-only" htmlFor="goalType">Select goal type to filter by</label>
      <Dropdown name="goalType" id="goalType" value={goalType} onChange={onApplyGoalType}>
        <option>
          RTTAPA
        </option>
        <option>
          Non-RTTAPA
        </option>
      </Dropdown>
    </>
  );
}

FilterGoalType.propTypes = {
  onApply: PropTypes.func.isRequired,
  goalType: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};
