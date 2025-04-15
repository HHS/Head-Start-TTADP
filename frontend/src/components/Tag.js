import React from 'react';
import PropTypes from 'prop-types';
import { Tag as TrussTag } from '@trussworks/react-uswds';
import classnames from 'classnames';

export default function Tag({
  children, className, clickable, handleClick,
}) {
  const tagClass = classnames(
    className,
    'bg-base-lightest',
    'border',
    'border-base',
    'text-ink',
    'display-inline-flex',
    'text-normal',
    'text-center',
    { 'text-underline': clickable },
  );
  return (
    <TrussTag className={tagClass} onClick={handleClick}>
      {children}
    </TrussTag>
  );
}

Tag.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  clickable: PropTypes.bool,
  handleClick: PropTypes.func,
};
Tag.defaultProps = {
  className: '',
  clickable: false,
  handleClick: undefined,
};
