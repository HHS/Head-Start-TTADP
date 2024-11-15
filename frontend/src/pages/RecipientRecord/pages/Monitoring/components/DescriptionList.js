import React from 'react';
import PropTypes from 'prop-types';
import './DescriptionList.css';

export default function DescriptionList({ children, className, vertical }) {
  const classNames = [
    'ttahub-data-card-description-list',
    'desktop:display-flex',
    'flex-align-start',
    'flex-row',
    className,
  ];

  if (vertical) {
    classNames.push('ttahub-data-card-description-list__vertical');
    classNames.push('flex-column');
  }

  return (
    <dl className={classNames.join(' ')}>
      {children}
    </dl>
  );
}

DescriptionList.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  vertical: PropTypes.bool,
};

DescriptionList.defaultProps = {
  className: '',
  vertical: false,
};
