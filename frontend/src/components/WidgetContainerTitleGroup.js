import React from 'react';
import PropTypes from 'prop-types';

const WidgetContainerTitleGroup = ({
  children, title, showHeaderBorder, subtitle,
}) => {
  if (!title) {
    return null;
  }

  return (
    <div className={`${showHeaderBorder ? 'smart-hub-widget-container-header-border' : ''} padding-3 display-flex flex-align-center flex-justify-start flex-gap-2`}>
      <h2 className="smart-hub--table-widget-heading margin-0 font-sans-lg">{title}</h2>
      {subtitle ? <p className="usa-prose margin-0">{subtitle}</p> : null }
      {children}
    </div>
  );
};

WidgetContainerTitleGroup.propTypes = {
  children: PropTypes.node,
  title: PropTypes.string,
  subtitle: PropTypes.string,
  showHeaderBorder: PropTypes.bool,
};

WidgetContainerTitleGroup.defaultProps = {
  children: null,
  title: '',
  subtitle: '',
  showHeaderBorder: false,
};

export default WidgetContainerTitleGroup;
