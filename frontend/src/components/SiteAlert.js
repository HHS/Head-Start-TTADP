import { SiteAlert as BaseSiteAlert } from '@trussworks/react-uswds';
import PropTypes from 'prop-types';
import React from 'react';
import './SiteAlert.scss';

// large keeps the USWDS layout: a bigger heading on its own line above the message
const HEADING_CLASSES = {
  large: 'display-block margin-0 margin-bottom-1 font-sans-lg line-height-sans-3 text-bold',
  default: 'display-inline margin-0 font-sans-xs line-height-sans-5 text-bold',
};

export default function SiteAlert({ heading, children, style, variant, size }) {
  const headingClasses = HEADING_CLASSES[size] || HEADING_CLASSES.default;

  return (
    <span aria-live="polite">
      <BaseSiteAlert
        variant={variant}
        showIcon
        style={{ ...style }}
        className={`usa-site-alert--ttahub usa-site-alert--ttahub__${size} no-print`}
      >
        {/* heading and message share one text container so they flow inline after the icon */}
        <div className="usa-alert__text flex-1 minw-0">
          <h3 className={headingClasses}>{heading}</h3> {children}
        </div>
      </BaseSiteAlert>
    </span>
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
