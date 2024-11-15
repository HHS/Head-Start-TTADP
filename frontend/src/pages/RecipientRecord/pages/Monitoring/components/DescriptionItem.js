import React from 'react';
import PropTypes from 'prop-types';

export default function DescriptionItem({ title, children, className }) {
  return (
    <div className={`desktop:margin-bottom-0 margin-bottom-1 margin-x-2 ${className}`}>
      <dt className="text-bold">{title}</dt>
      <dd>
        {children}
      </dd>
    </div>
  );
}

DescriptionItem.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

DescriptionItem.defaultProps = {
  className: '',
};
