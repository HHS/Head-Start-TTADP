import React from 'react';
import PropTypes from 'prop-types';
import { v4 as uuidv4 } from 'uuid';
import Tooltip from './Tooltip';

export default function TooltipWithCollection({ collection, collectionTitle }) {
  if (!collection || collection.length === 0) {
    return null;
  }

  const tooltip = (collection).reduce(
    (result, member) => `${result + member}\n`,
    '',
  );

  const tags = (collection).map((member) => (
    <span
      key={uuidv4()}
      className="smart-hub--tooltip-truncated"
    >
      {member}
      &nbsp;
    </span>
  ));

  if (collection.length === 1) {
    return (
      <span className="smarthub-ellipsis">{tooltip}</span>
    );
  }

  return (
    <Tooltip
      displayText={tags}
      tooltipText={tooltip}
      buttonLabel={`click to visually reveal the ${collectionTitle}`}
    />
  );
}

TooltipWithCollection.propTypes = {
  collection: PropTypes.arrayOf(PropTypes.string).isRequired,
  collectionTitle: PropTypes.string.isRequired,
};
