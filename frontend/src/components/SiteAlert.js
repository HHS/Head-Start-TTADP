import React from 'react';
import PropTypes from 'prop-types';
import { SiteAlert as BaseSiteAlert } from '@trussworks/react-uswds';
import './SiteAlert.scss';

export default function SiteAlert({
  heading, children, style, variant, size,
}) {
  return (
    <div aria-live={alert.variant === 'emergency' ? 'assertive' : 'polite'}>
      <BaseSiteAlert
        variant={variant}
        heading={heading}
        showIcon
        style={{ ...style }}
        className={`usa-site-alert--ttahub usa-site-alert--ttahub__${size} no-print`}
      >
        {children}
      </BaseSiteAlert>
    </div>
  );
}

SiteAlert.propTypes = {
  heading: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  style: PropTypes.shape({}),
  variant: PropTypes.string.isRequired,
  size: PropTypes.string.isRequired,
};

SiteAlert.defaultProps = {
  style: {},
};
