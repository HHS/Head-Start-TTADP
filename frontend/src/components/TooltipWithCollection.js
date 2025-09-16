import React from 'react';
import PropTypes from 'prop-types';
import { v4 as uuidv4 } from 'uuid';
import Tooltip from './Tooltip';
import TextTrim from './TextTrim';

export default function TooltipWithCollection({ collection, collectionTitle, position }) {
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
      className="smart-hub-tooltip--truncated smart-hub-tooltip--truncated--with-collection"
    >
      {member}
      &nbsp;
    </span>
  ));

  if (collection.length === 1) {
    return (
      <TextTrim text={collection[0]} />
    );
  }

  return (
    <Tooltip
      displayText={tags}
      tooltipText={tooltip}
      buttonLabel={`click to visually reveal the ${collectionTitle}`}
      position={position}
    />
  );
}

TooltipWithCollection.propTypes = {
  collection: PropTypes.arrayOf(PropTypes.string).isRequired,
  collectionTitle: PropTypes.string.isRequired,
  position: PropTypes.string,
};

TooltipWithCollection.defaultProps = {
  position: 'top',
};
