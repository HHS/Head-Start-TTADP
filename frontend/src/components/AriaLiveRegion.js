import PropTypes from 'prop-types';
import React from 'react';

function AriaLiveRegion(props) {
  const { messages } = props;

  return (
    <output className="usa-sr-only">
      {
        // messages are not unique and don't have unique key
        // biome-ignore lint/suspicious/noArrayIndexKey: lack other unique differentiator
        messages.map((m, index) => (
          <p key={index}>{m}</p>
        ))
      }
    </output>
  );
}

AriaLiveRegion.propTypes = {
  messages: PropTypes.arrayOf(PropTypes.string),
};

AriaLiveRegion.defaultProps = {
  messages: [],
};

export default AriaLiveRegion;
