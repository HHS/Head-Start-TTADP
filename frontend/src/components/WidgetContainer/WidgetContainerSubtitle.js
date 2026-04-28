import React from 'react';
import PropTypes from 'prop-types';

export default function WidgetContainerSubtitle({
  children,
  marginY,
  customCss,
}) {
  return (
    <p className={`smart-hub-widget--subtitle usa-prose margin-x-0 ${customCss ? '' : `margin-y-${marginY}`} ${customCss}`}>{children}</p>
  );
}

WidgetContainerSubtitle.propTypes = {
  children: PropTypes.node.isRequired,
  marginY: PropTypes.number,
  customCss: PropTypes.string,
};

WidgetContainerSubtitle.defaultProps = {
  marginY: 0,
  customCss: '',
};
