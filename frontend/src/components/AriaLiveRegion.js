import PropTypes from 'prop-types';
import React from 'react';

function AriaLiveRegion(props) {
  const { messages } = props;

  return (
    // biome-ignore lint/a11y/useSemanticElements: keep explicit role and aria-live semantics on this hidden announcement region
    <div className="usa-sr-only" role="status" aria-live="polite">
      {
        // messages are not unique and don't have unique key
        messages.map((m, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: lack other unique differentiator
          <p key={index}>{m}</p>
        ))
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
