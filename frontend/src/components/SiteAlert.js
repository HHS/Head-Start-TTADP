import React from 'react';
import PropTypes from 'prop-types';
import { SiteAlert as BaseSiteAlert } from '@trussworks/react-uswds';
import './SiteAlert.css';

export default function SiteAlert({
  heading, children, style, variant,
}) {
  return (
    <BaseSiteAlert
      variant={variant}
      heading={heading}
      showIcon
      style={{ ...style }}
      className="usa-site-alert--ttahub"
    >
      {children}
    </BaseSiteAlert>
  );
}

SiteAlert.propTypes = {
  heading: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  style: PropTypes.shape({}),
  variant: PropTypes.string.isRequired,
};

SiteAlert.defaultProps = {
  style: {},
};
