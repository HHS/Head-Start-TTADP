import React from 'react';
import PropTypes from 'prop-types';

export default function WidgetCard({
  header,
  children,
  footer,
  className,
}) {
  return (
    <div className={`ttahub-widget-card bg-white radius-md shadow-2 margin-bottom-3 padding-3 ${className}`}>
      <div className="ttahub-widget-card--header">
        {header}
      </div>

      <div className="ttahub-widget-card--body">
        {children}
      </div>

      <div className="ttahub-widget-card--footer">
        {footer}
      </div>

    </div>
  );
}

WidgetCard.propTypes = {
  header: PropTypes.node,
  children: PropTypes.node.isRequired,
  footer: PropTypes.node,
  className: PropTypes.string,
};

WidgetCard.defaultProps = {
  header: null,
  footer: null,
  className: '',
};
