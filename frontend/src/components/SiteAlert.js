import React from 'react';
import PropTypes from 'prop-types';
import { SiteAlert as BaseSiteAlert } from '@trussworks/react-uswds';
import './SiteAlert.css';

export default function SiteAlert({ heading, children, style }) {
  return (
    <BaseSiteAlert
      variant="info"
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
};

SiteAlert.defaultProps = {
  style: {},
};
