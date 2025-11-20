import React from 'react';
import PropTypes from 'prop-types';

/**
 * the most generic possible implementation of a card component for the widget
 * takes in an arbitrary header, body, and footer and renders them in a "card",
 * I.E. a rounded rectangle with a shadow
 *
 * the idea is that this component can be used to wrap any widget, and the margin, padding,
 * and other styling will be consistent. Hopefully can extend existing widgets to use this
 * and add specialized variations of this component as needed
 *
 * @param {props} see proptypes below
 * @returns react component
 */
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

      {footer && (
        <div className="ttahub-widget-card--footer">
          {footer}
        </div>
      )}
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
