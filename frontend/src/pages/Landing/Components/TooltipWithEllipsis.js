import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEllipsisH } from '@fortawesome/free-solid-svg-icons';
import { Tag } from '@trussworks/react-uswds';
import './TooltipWithEllipsis.css';

export default function TooltipWithEllipsis({ collection, limit }) {
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

  return (
    <span className="smart-hub--tooltip-with-ellipsis">
      <span className="smart-hub--ellipsis">
        {tags}
      </span>
      <button type="button" className="usa-button usa-button--unstyled">
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
