import React from 'react';
import PropTypes from 'prop-types';

const classes = 'bg-white radius-md shadow-2 margin-bottom-3';

function Container({ children, className, padding }) {
  return (
    <div className={`${classes} ${className}`}>
      <div className={`padding-${padding}`}>
        {children}
      </div>
    </div>
  );
}

Container.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  padding: PropTypes.number,
};

Container.defaultProps = {
  className: '',
  padding: 5,
};

export default Container;
