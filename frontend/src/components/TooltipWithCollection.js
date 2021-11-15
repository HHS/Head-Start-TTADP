import React from 'react';
import PropTypes from 'prop-types';
import { v4 as uuidv4 } from 'uuid';
import Tooltip from './Tooltip';

export default function TooltipWithCollection({ collection, collectionTitle }) {
  if (!collection || collection.length === 0) {
    return null;
  }

  const tooltip = (collection).reduce(
    (result, member) => (
      <>
        {result}
        <span>{member}</span>
        <br />
      </>
    ), <></>,
  );

  const tags = (collection).map((member) => (
    <span
      key={uuidv4()}
      className="smart-hub--tooltip-truncated smart-hub--tooltip-truncated--with-collection"
    >
      {member}
      &nbsp;
    </span>
  ));

  if (collection.length === 1) {
    return (
      <Tooltip
        displayText={tooltip}
        tooltipText={tooltip}
        buttonLabel={`click to visually reveal the ${collectionTitle}`}
      />
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
