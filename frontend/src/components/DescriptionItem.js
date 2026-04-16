import React from 'react';
import PropTypes from 'prop-types';

export default function DescriptionItem({
  title,
  children,
  className,
  hideIf,
}) {
  if (hideIf) {
    return null;
  }

  return (
    <div className={`desktop:margin-bottom-0 margin-bottom-1 ${className}`}>
      <dt className="text-bold">{title}</dt>
      <dd className="margin-left-0">
        {children}
      </dd>
    </div>
  );
}

DescriptionItem.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node,
  className: PropTypes.string,
  hideIf: PropTypes.bool,
};

DescriptionItem.defaultProps = {
  className: '',
  hideIf: false,
  children: null,
};
