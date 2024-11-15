import React from 'react';
import PropTypes from 'prop-types';
import ExpanderButton from '../../../../../components/ExpanderButton';
import NoTtaProvidedAgainst from './NoTtaProvidedAgainst';

export default function ToggleTtaActivityButton({ count, expanded, setExpanded }) {
  if (count === 0) {
    return (
      <NoTtaProvidedAgainst />
    );
  }

  return (
    <ExpanderButton
      closeOrOpen={() => setExpanded(!expanded)}
      count={count}
      expanded={expanded}
      type="TTA activity"
      showCount={false}
      pluralize={false}
    />
  );
}

ToggleTtaActivityButton.propTypes = {
  count: PropTypes.number.isRequired,
  expanded: PropTypes.bool.isRequired,
  setExpanded: PropTypes.func.isRequired,
};
