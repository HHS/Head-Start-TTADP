import React from 'react';
import PropTypes from 'prop-types';

function AriaLiveRegion(props) {
  const { messages } = props;

  return (
    <div className="sr-only" role="status">
      { // messages are not unique and don't have unique key
        // eslint-disable-next-line react/no-array-index-key
        messages.map((m, index) => (<p key={index}>{m}</p>))
      }
    </div>
  );
}

AriaLiveRegion.propTypes = {
  messages: PropTypes.arrayOf(PropTypes.string),
};

AriaLiveRegion.defaultProps = {
  messages: [],
};

export default AriaLiveRegion;
