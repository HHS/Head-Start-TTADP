import React, { useEffect } from 'react';
import PropTypes from 'prop-types';

function DismissingComponentWrapper({
  shown, timeVisibleInSec, hideFromScreenReader, children, updateShown,
}) {
  useEffect(() => {
    let id;
    if (shown) {
      id = setTimeout(() => {
        updateShown(false);
      }, [timeVisibleInSec * 1000]);
    } else {
      clearTimeout(id);
    }

    return () => {
      clearTimeout(id);
    };
  }, [shown]);

  return (
    <>
      {shown && (
      <div aria-hidden={hideFromScreenReader}>
        {children}
      </div>
      )}
    </>
  );
}

DismissingComponentWrapper.propTypes = {
  shown: PropTypes.bool.isRequired,
  timeVisibleInSec: PropTypes.number,
  hideFromScreenReader: PropTypes.bool,
  updateShown: PropTypes.func.isRequired,
  children: PropTypes.node,
};

DismissingComponentWrapper.defaultProps = {
  timeVisibleInSec: 30,
  hideFromScreenReader: true,
  children: null,
};

export default DismissingComponentWrapper;
