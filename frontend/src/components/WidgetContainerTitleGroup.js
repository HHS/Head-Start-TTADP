import React from 'react';
import PropTypes from 'prop-types';

const WidgetContainerTitleGroup = ({
  children,
  title,
  showHeaderBorder,
  subtitle,
  className,
  pagination,
}) => {
  if (!title) {
    return null;
  }

  return (
    <div className={`${showHeaderBorder ? 'smart-hub-widget-container-header-border' : ''} ${className} desktop:display-flex flex-justify flex-align-center flex-gap-2`}>
      <div className="desktop:display-flex flex-align-center flex-gap-2">
        <div>
          <h2 className="smart-hub--table-widget-heading margin-0 margin-y-2 font-sans-lg">{title}</h2>
          {subtitle ? <p className="usa-prose margin-x-0 margin-y-2">{subtitle}</p> : null }
        </div>
        {children}
      </div>
      {pagination}
    </div>
  );
};

WidgetContainerTitleGroup.propTypes = {
  children: PropTypes.node,
  title: PropTypes.string,
  subtitle: PropTypes.string,
  showHeaderBorder: PropTypes.bool,
  className: PropTypes.string,
  pagination: PropTypes.node,
};

WidgetContainerTitleGroup.defaultProps = {
  children: null,
  pagination: null,
  title: '',
  subtitle: '',
  showHeaderBorder: false,
  className: 'padding-3 ',
};

export default WidgetContainerTitleGroup;
