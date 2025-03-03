import React from 'react';
import PropTypes from 'prop-types';
import ContextMenu from '../ContextMenu';
import useMarginFromConfig from '../../hooks/useMarginFromConfig';

const WidgetContainerTitleGroup = ({
  children,
  title,
  showHeaderBorder,
  subtitle,
  pagination,
  menuItems,
  titleMargin,
}) => {
  const h2Margins = useMarginFromConfig(titleMargin);

  if (!title) {
    return null;
  }

  return (
    <div className={`smart-hub--table-widget-container padding-x-3 padding-top-3 position-relative ${showHeaderBorder ? 'border-bottom smart-hub-border-base-lighter' : ''} desktop:display-flex flex-justify flex-align-center flex-gap-2`}>
      <div className="desktop:display-flex flex-align-center flex-gap-2">
        <div>
          <h2 className={`smart-hub--table-widget-heading ${h2Margins} font-sans-lg`}>
            {title}
          </h2>
          {subtitle}
        </div>
        {children}
      </div>
      <div>
        {(menuItems.length > 0 && (
          <div className="position-absolute top-0 right-0 margin-top-3 margin-right-3">
            <ContextMenu
              menuItems={menuItems}
              label={`Open Actions for ${title}`}
            />
          </div>
        ))}
      </div>
      {pagination}
    </div>
  );
};

WidgetContainerTitleGroup.propTypes = {
  children: PropTypes.node,
  title: PropTypes.string,
  subtitle: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  showHeaderBorder: PropTypes.bool,
  pagination: PropTypes.node,
  menuItems: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string,
    onClick: PropTypes.func,
  })),
  titleMargin: PropTypes.shape({
    bottom: PropTypes.number,
    top: PropTypes.number,
    right: PropTypes.number,
    left: PropTypes.number,
  }),
};

WidgetContainerTitleGroup.defaultProps = {
  children: null,
  pagination: null,
  title: '',
  subtitle: '',
  showHeaderBorder: false,
  menuItems: [],
  titleMargin: {
    bottom: 0,
    top: 0,
    left: 0,
    right: 0,
  },
};

export default WidgetContainerTitleGroup;
