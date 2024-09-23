import React from 'react';
import PropTypes from 'prop-types';
import ContextMenu from './ContextMenu';
import DisplayTableToggle from './DisplayTableToggleButton';
import './WidgetContainerTitleGroup.scss';

const WidgetContainerTitleGroup = ({
  children,
  title,
  showHeaderBorder,
  subtitle,
  className,
  pagination,
  displayTable,
  setDisplayTable,
  menuItems,

  TitleDrawer,
  SubtitleDrawer,
}) => {
  if (!title) {
    return null;
  }

  return (
    <div className={`smart-hub--table-widget-container ${showHeaderBorder ? 'border-bottom smart-hub-border-base-lighter' : ''} ${className} desktop:display-flex flex-justify flex-align-center flex-gap-2`}>
      <div className="desktop:display-flex flex-align-center flex-gap-2">
        <div>
          <h2 className="smart-hub--table-widget-heading margin-0 margin-y-2 font-sans-lg">
            {title}
            <TitleDrawer />
          </h2>
          {subtitle ? <p className="usa-prose margin-x-0 margin-y-2">{subtitle}</p> : null}
          <SubtitleDrawer />
        </div>
        {children}
      </div>
      <div>
        {setDisplayTable && (
          <DisplayTableToggle
            title={title}
            displayTable={displayTable}
            setDisplayTable={setDisplayTable}
          />
        )}
        {(menuItems.length > 0 && (
          <ContextMenu
            menuItems={menuItems}
            label={`Open Actions for ${title}`}
          />
        ))}
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
  displayTable: PropTypes.bool,
  setDisplayTable: PropTypes.func,
  TitleDrawer: PropTypes.func,
  SubtitleDrawer: PropTypes.func,
  menuItems: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string,
    onClick: PropTypes.func,
  })),
};

WidgetContainerTitleGroup.defaultProps = {
  children: null,
  pagination: null,
  title: '',
  subtitle: '',
  showHeaderBorder: false,
  className: 'padding-3 ',
  displayTable: false,
  setDisplayTable: null,
  menuItems: [],

  SubtitleDrawer: null,
  TitleDrawer: null,
};

export default WidgetContainerTitleGroup;
