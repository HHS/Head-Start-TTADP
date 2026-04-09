import PropTypes from 'prop-types';
import React from 'react';

function AriaLiveRegion(props) {
  const { messages } = props;

  return (
    <output className="usa-sr-only">
      {
        // messages are not unique and don't have unique key
        // eslint-disable-next-line react/no-array-index-key
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
