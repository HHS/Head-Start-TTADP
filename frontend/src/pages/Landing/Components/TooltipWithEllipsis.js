import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { v4 as uuidv4 } from 'uuid';

import './TooltipWithEllipsis.css';

export default function TooltipWithEllipsis({ collection, collectionTitle }) {
  const [showTooltip, setShowTooltip] = useState(false);

  const cssClasses = showTooltip ? 'smart-hub--tooltip-with-ellipsis show-tooltip' : 'smart-hub--tooltip-with-ellipsis';

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

  const onClick = () => {
    setShowTooltip(!showTooltip);
    setTimeout(() => {
      setShowTooltip(false);
    }, 1500);
  };

  return (
    <span className={cssClasses} data-testid="tooltip">
      <div aria-hidden="true" className="usa-tooltip__body usa-tooltip__body--top">{tooltip}</div>
      <button type="button" className="usa-button usa-button--unstyled" onClick={onClick}>
        <span className="smart-hub--ellipsis">
          {tags}
        </span>
        <span className="sr-only">
          click to visually reveal the
          &nbsp;
          {collectionTitle}
        </span>
      </button>
    </span>
  );
}

TooltipWithEllipsis.propTypes = {
  collection: PropTypes.arrayOf(PropTypes.string).isRequired,
  collectionTitle: PropTypes.string.isRequired,
};
