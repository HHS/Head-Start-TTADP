import React, { forwardRef } from 'react';
import PropTypes from 'prop-types';

import Loader from './Loader';

const classes = 'bg-white radius-md shadow-2 margin-bottom-3';

const Container = forwardRef((props, ref) => {
  const {
    children,
    className,
    skipTopPadding,
    skipBottomPadding,
    loading,
    loadingLabel,
    paddingX,
    paddingY,
    positionRelative,
  } = props;

  const skipTop = skipTopPadding ? 'padding-top-0' : '';
  const skipBottom = skipBottomPadding ? 'padding-bottom-0' : '';
  const relative = positionRelative ? 'position-relative' : '';

  return (
    <div className={`${classes} ${className}`} ref={ref}>
      <Loader loading={loading} loadingLabel={loadingLabel} />
      <div className={`padding-x-${paddingX} padding-y-${paddingY} ${relative} ${skipTop} ${skipBottom}`}>
        {children}
      </div>
    </div>
  );
});

Container.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  paddingX: PropTypes.number,
  paddingY: PropTypes.number,
  skipTopPadding: PropTypes.bool,
  skipBottomPadding: PropTypes.bool,
  loading: PropTypes.bool,
  loadingLabel: PropTypes.string,
  positionRelative: PropTypes.bool,
};

Container.defaultProps = {
  className: '',
  paddingX: 5,
  paddingY: 5,
  skipTopPadding: false,
  skipBottomPadding: false,
  loading: false,
  loadingLabel: 'loading',
  positionRelative: false,
};

export default Container;
