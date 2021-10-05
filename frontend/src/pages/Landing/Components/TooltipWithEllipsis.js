import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import './TooltipWithEllipsis.css';

export default function TooltipWithEllipsis({ collection, limit }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [cssClasses, setCssClasses] = useState('smart-hub--tooltip-with-ellipsis');
  const [tooltipTop, setTooltipTop] = useState({
    top: 0,
  });

  const tooltipRef = useRef();

  useEffect(() => {
    setCssClasses(showTooltip ? 'smart-hub--tooltip-with-ellipsis show-tooltip' : 'smart-hub--tooltip-with-ellipsis');
  }, [showTooltip]);

  if (collection.length === 0) {
    return null;
  }

  const tooltip = (collection || []).reduce(
    (result, member) => `${result + member}\n`,
    '',
  );

  const tags = (collection || []).map((member) => (
    <span
      key={member.slice(1, limit)}
      className="smart-hub--tooltip-truncated"
    >
      {member}
      &nbsp;
    </span>
  ));

  if (collection.length === 1) {
    return (
      <span>{tooltip}</span>
    );
  }

  const onHover = () => {
    if (tooltipRef.current) {
      setTooltipTop({
        top: (tooltipRef.current.offsetHeight) * -1,
      });
    }
  };

  const onClick = () => {
    setShowTooltip(!showTooltip);
    setTimeout(() => {
      setShowTooltip(false);
    }, 1000);
  };

  return (
    <span className={cssClasses} onHover={onHover}>
      <button type="button" className="usa-button usa-button--unstyled" onClick={onClick} onHover={onHover}>
        <span className="smart-hub--ellipsis">
          {tags}
        </span>
        <span className="usa-tooltip__body usa-tooltip__body--top" role="tooltip" ref={tooltipRef} style={tooltipTop}>{tooltip}</span>
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
