import React from 'react';
import PropTypes from 'prop-types';
import ContextMenu from './ContextMenu';

import DisplayTableToggle from './DisplayTableToggleButton';
import DrawerTriggerButton from './DrawerTriggerButton';
import './WidgetContainerTitleGroup.scss';

const WidgetContainerTitleGroup = ({
  children,
  title,
  showHeaderBorder,
  subtitle,
  subtitle2,
  className,
  pagination,
  enableCheckboxes,
  exportRows,
  displayTable,
  setDisplayTable,
  titleDrawerText,
  titleDrawerRef,
  subtitleDrawerLinkText,
  subtitleDrawerLinkRef,
}) => {
  if (!title) {
    return null;
  }

  const menuItems = enableCheckboxes ? [
    {
      label: 'Export selected rows',
      onClick: () => {
        exportRows('selected');
      },
    },
    {
      label: 'Export table',
      onClick: () => {
        exportRows('all');
      },
    },
  ] : [];

  return (
    <div className={`${showHeaderBorder ? 'border-bottom smart-hub-border-base-lighter' : ''} ${className} desktop:display-flex flex-justify flex-align-center flex-gap-2`}>
      <div className="desktop:display-flex flex-align-center flex-gap-2">
        <div>
          <h2 className="smart-hub--table-widget-heading margin-0 margin-y-2 font-sans-lg">
            {title}
            {
                titleDrawerText && (
                <DrawerTriggerButton customClass="font-sans-lg" drawerTriggerRef={titleDrawerRef}>
                  {titleDrawerText}
                </DrawerTriggerButton>
                )
              }
          </h2>
          {subtitle ? <p className={`usa-prose margin-x-0 ${subtitle2 ? 'margin-y-0' : 'margin-y-2'}`}>{subtitle}</p> : null}
          {subtitle2 && (
            <div>
              <strong><p className="usa-prose margin-x-0 margin-top-1 margin-bottom-2">{subtitle2}</p></strong>
            </div>
          )}
          {subtitleDrawerLinkText && (
            <div className="margin-x-0 margin-y-3 ">
              <DrawerTriggerButton drawerTriggerRef={subtitleDrawerLinkRef} removeLeftMargin>
                {subtitleDrawerLinkText}
              </DrawerTriggerButton>
            </div>
          )}
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
            label="Export actions for courses"
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
  enableCheckboxes: PropTypes.bool,
  exportRows: PropTypes.func,
  displayTable: PropTypes.bool,
  setDisplayTable: PropTypes.func,
  titleDrawerText: PropTypes.string,
  titleDrawerRef: PropTypes.shape({ current: PropTypes.instanceOf(Element) }),
  subtitleDrawerLinkText: PropTypes.string,
  subtitleDrawerLinkRef: PropTypes.shape({ current: PropTypes.instanceOf(Element) }),
};

WidgetContainerTitleGroup.defaultProps = {
  children: null,
  pagination: null,
  title: '',
  subtitle: '',
  subtitle2: '',
  showHeaderBorder: false,
  className: 'padding-3 ',
  enableCheckboxes: false,
  exportRows: null,
  displayTable: false,
  setDisplayTable: null,
  titleDrawerText: '',
  titleDrawerRef: null,
  subtitleDrawerLinkText: '',
  subtitleDrawerLinkRef: null,
};

export default WidgetContainerTitleGroup;
