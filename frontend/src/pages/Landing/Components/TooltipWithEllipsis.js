import React, { useRef, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEllipsisH } from '@fortawesome/free-solid-svg-icons';
import { Tag } from '@trussworks/react-uswds';
import './TooltipWithEllipsis.css';

export default function TooltipWithEllipsis({ collection, limit }) {
  const [showTooltip, setShowTooltip] = useState(false);
  // const [tooltipPosition, setTooltipPosition] = useState({
  //   left: 0,
  //   top: 0,
  // });

  const button = useRef();

  useEffect(() => {
    // if (button.current) {
    //   const rect = button.current.getBoundingClientRect();
    //   const { left, top, width } = rect;
    //   setTooltipPosition({ left: left + width, top });
    // }
  }, []);

  if (collection.length === 0) {
    return null;
  }

  const tooltip = (collection || []).reduce(
    (result, member) => `${result + member}\n`,
    '',
  );

  const tags = (collection || []).map((member) => (
    <Tag
      key={member.slice(1, limit)}
      className="smart-hub--table-collection"
    >
      {member}
    </Tag>
  ));

  console.log(showTooltip);
  const cssClasses = showTooltip ? 'smart-hub--tooltip-with-ellipsis show-tooltip' : 'smart-hub--tooltip-with-ellipsis';

  return (
    <span className={cssClasses}>
      <span className="smart-hub--ellipsis">
        {tags}
      </span>
      <button type="button" className="usa-button usa-button--unstyled" ref={button} onClick={() => setShowTooltip(true)}>
        <FontAwesomeIcon icon={faEllipsisH} color="black" />
        <span className="usa-tooltip__body usa-tooltip__body--right" role="tooltip">{tooltip}</span>
      </button>
    </span>
  );
}

TooltipWithEllipsis.propTypes = {
  collection: PropTypes.arrayOf(PropTypes.string).isRequired,
  limit: PropTypes.number,
};

TooltipWithEllipsis.defaultProps = {
  limit: 13,
};
