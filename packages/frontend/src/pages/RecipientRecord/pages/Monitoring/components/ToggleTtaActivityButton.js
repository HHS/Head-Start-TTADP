import React from 'react';
import PropTypes from 'prop-types';
import ExpanderButton from '../../../../../components/ExpanderButton';

export default function ToggleTtaActivityButton({ count, expanded, setExpanded }) {
  return (
    <ExpanderButton
      closeOrOpen={() => setExpanded(!expanded)}
      count={count}
      expanded={expanded}
      type="TTA activity"
      showCount={false}
      pluralize={false}
      ariaLabel="TTA activity"
    />
  );
}

ToggleTtaActivityButton.propTypes = {
  count: PropTypes.number.isRequired,
  expanded: PropTypes.bool.isRequired,
  setExpanded: PropTypes.func.isRequired,
};
