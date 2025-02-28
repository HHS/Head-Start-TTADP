import React from 'react';
import PropTypes from 'prop-types';
import ContextMenu from './ContextMenu';
import DisplayTableToggle from './DisplayTableToggleButton';
import FiltersNotApplicable from './FiltersNotApplicable';
import './WidgetContainerTitleGroup.scss';

const WidgetContainerTitleGroup = ({
  children,
  title,
  showHeaderBorder,
  subtitle,
  subtitle2,
  className,
  pagination,
  displayTable,
  setDisplayTable,
  menuItems,

  TitleDrawer,
  SubtitleDrawer,
  showFiltersNotApplicable,
}) => {
  if (!title) {
    return null;
  }

  return (
    <div className={`smart-hub--table-widget-container ${showHeaderBorder ? 'border-bottom smart-hub-border-base-lighter' : ''} ${className} desktop:display-flex flex-justify flex-align-center flex-gap-2`}>
      <div className="desktop:display-flex flex-align-center flex-gap-2">
        <div>
          <div className="display-flex">
            <h2 className="smart-hub--table-widget-heading margin-0 margin-y-2 font-sans-lg">
              {title}
            </h2>
            <TitleDrawer />
          </div>
          {subtitle ? <p className={`smart-hub-table-widget--subtitle usa-prose margin-x-0 margin-y-${subtitle2 ? '0' : '2'}`}>{subtitle}</p> : null}
          {subtitle2 && (
            <div className="smart-hub-table-widget--subtitle-2-container display-flex align-items-baseline">
              <p className="smart-hub-table-widget--subtitle-2 usa-prose margin-x-0 margin-top-0 margin-bottom-2">
                <strong>{subtitle2}</strong>
                {
            showFiltersNotApplicable && (
            <FiltersNotApplicable />
            )
          }
              </p>

            </div>
          )}
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
            fixed
            menuItems={menuItems}
            label={`Open Actions for ${title}`}
            menuWidthOffset={140}
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
  subtitle2: PropTypes.string,
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
  showFiltersNotApplicable: PropTypes.bool,
};

WidgetContainerTitleGroup.defaultProps = {
  children: null,
  pagination: null,
  title: '',
  subtitle: '',
  subtitle2: '',
  showHeaderBorder: false,
  className: 'padding-3 ',
  displayTable: false,
  setDisplayTable: null,
  menuItems: [],

  SubtitleDrawer: null,
  TitleDrawer: null,
  showFiltersNotApplicable: false,
};

export default WidgetContainerTitleGroup;
