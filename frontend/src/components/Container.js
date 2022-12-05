import React from 'react';
import PropTypes from 'prop-types';

import Loader from './Loader';

const classes = 'bg-white radius-md shadow-2 margin-bottom-3';

function Container({
  children,
  className,
  skipTopPadding,
  skipBottomPadding,
  loading,
  loadingLabel,
  paddingX,
  paddingY,
}) {
  const skipTop = skipTopPadding ? 'padding-top-0' : '';
  const skipBottom = skipBottomPadding ? 'padding-bottom-0' : '';

  return (
    <div className={`${classes} ${className} position-relative`}>
      <Loader loading={loading} loadingLabel={loadingLabel} />
      <div className={`padding-x-${paddingX} padding-y-${paddingY} ${skipTop} ${skipBottom}`}>
        {children}
      </div>
    </div>
  );
}

Container.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  paddingX: PropTypes.number,
  paddingY: PropTypes.number,
  skipTopPadding: PropTypes.bool,
  skipBottomPadding: PropTypes.bool,
  loading: PropTypes.bool,
  loadingLabel: PropTypes.string,
};

Container.defaultProps = {
  className: '',
  paddingX: 5,
  paddingY: 5,
  skipTopPadding: false,
  skipBottomPadding: false,
  loading: false,
  loadingLabel: 'loading',
};

export default Container;
