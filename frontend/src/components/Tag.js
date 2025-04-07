import React from 'react';
import PropTypes from 'prop-types';
import { Tag as TrussTag } from '@trussworks/react-uswds';
// eslint-disable-next-line import/no-extraneous-dependencies
import classnames from 'classnames';
import './Tag.scss';

export default function Tag({
  children, className, clickable, handleClick,
}) {
  const tagClass = classnames('ttahub-tag', className, {
    'ttahub-tag-underline': clickable,
  });
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
