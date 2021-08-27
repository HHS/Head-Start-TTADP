import React from 'react';
import PropTypes from 'prop-types';

import Loader from './Loader';

const classes = 'bg-white radius-md shadow-2 margin-bottom-3';

function Container({
  children, className, padding, skipTopPadding, skipBottomPadding, loading,
}) {
  const skipTop = skipTopPadding ? 'padding-top-0' : '';
  const skipBottom = skipBottomPadding ? 'padding-bottom-0' : '';
  return (
    <div className={`${classes} ${className} position-relative`}>
      <Loader loading={loading} />
      <div className={`padding-${padding} ${skipTop} ${skipBottom}`}>
        {children}
      </div>
    </div>
  );
}

Container.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  padding: PropTypes.number,
  skipTopPadding: PropTypes.bool,
  skipBottomPadding: PropTypes.bool,
  loading: PropTypes.bool,
};

Container.defaultProps = {
  className: '',
  padding: 5,
  skipTopPadding: false,
  skipBottomPadding: false,
  loading: false,
};

export default Container;
