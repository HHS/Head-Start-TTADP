import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import ContextMenu from './ContextMenu';

import DisplayTableToggle from './DisplayTableToggleButton';
import DrawerTriggerButton from './DrawerTriggerButton';
import Drawer from './Drawer';
import ContentFromFeedByTag from './ContentFromFeedByTag';
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
  titleDrawerTitle,
  titleDrawerCssClass,
  subtitleDrawerLinkText,
  subtitleDrawerTitle,
  subtitleDrawerCssClass,
  subtitle2DrawerLinkText,
  subtitle2DrawerTitle,
  subtitle2DrawerCssClass,
}) => {
  console.log('subtitleDrawerLinkText', subtitleDrawerLinkText);
  const titleDrawerRef = useRef(null);
  const subtitleDrawerLinkRef = useRef(null);
  const subtitle2DrawerLinkRef = useRef(null);
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
    <div className={`smart-hub--table-widget-container ${showHeaderBorder ? 'border-bottom smart-hub-border-base-lighter' : ''} ${className} desktop:display-flex flex-justify flex-align-center flex-gap-2`}>
      <div className="desktop:display-flex flex-align-center flex-gap-2">
        <div>
          <h2 className="smart-hub--table-widget-heading margin-0 margin-y-2 font-sans-lg">
            {title}
            {
                titleDrawerText && (
                <>
                  <DrawerTriggerButton customClass="font-sans-lg margin-left-1 text-bold" drawerTriggerRef={titleDrawerRef}>
                    {titleDrawerText}
                  </DrawerTriggerButton>
                  <Drawer
                    triggerRef={titleDrawerRef}
                    stickyHeader
                    stickyFooter
                    title={titleDrawerTitle}
                  >
                    <ContentFromFeedByTag tagName={titleDrawerCssClass} contentSelector="table" />
                  </Drawer>
                </>
                )
              }
          </h2>
          {subtitle ? <p className={`usa-prose margin-x-0 ${subtitle2 ? 'margin-y-0' : 'margin-y-2'}`}>{subtitle}</p> : null}
          {subtitleDrawerLinkText && (
            <div className="margin-x-0 margin-y-3">
              <DrawerTriggerButton drawerTriggerRef={subtitleDrawerLinkRef} customClass="margin-x-0">
                {subtitleDrawerLinkText}
              </DrawerTriggerButton>
              <Drawer
                triggerRef={subtitleDrawerLinkRef}
                stickyHeader
                stickyFooter
                title={subtitleDrawerTitle}
              >
                <ContentFromFeedByTag tagName={subtitleDrawerCssClass} contentSelector="table" />
              </Drawer>
            </div>
          )}
          {subtitle2 && (
            <div>
              <strong><p className="usa-prose margin-x-0 margin-top-1 margin-bottom-2">{subtitle2}</p></strong>
            </div>
          )}
          {subtitle2DrawerLinkText && (
            <div className="margin-x-0 margin-y-3 ">
              <DrawerTriggerButton drawerTriggerRef={subtitle2DrawerLinkRef} removeLeftMargin>
                {subtitle2DrawerLinkText}
              </DrawerTriggerButton>
              <Drawer
                triggerRef={subtitle2DrawerLinkRef}
                stickyHeader
                stickyFooter
                title={subtitle2DrawerTitle}
              >
                <ContentFromFeedByTag tagName={subtitle2DrawerCssClass} contentSelector="table" />
              </Drawer>
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
  titleDrawerTitle: PropTypes.string,
  titleDrawerCssClass: PropTypes.string,
  subtitleDrawerLinkText: PropTypes.string,
  subtitleDrawerTitle: PropTypes.string,
  subtitleDrawerCssClass: PropTypes.string,
  subtitle2DrawerLinkText: PropTypes.string,
  subtitle2DrawerTitle: PropTypes.string,
  subtitle2DrawerCssClass: PropTypes.string,
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
  titleDrawerTitle: '',
  titleDrawerCssClass: '',
  subtitleDrawerLinkText: '',
  subtitleDrawerTitle: '',
  subtitleDrawerCssClass: '',
  subtitle2DrawerLinkText: '',
  subtitle2DrawerTitle: null,
  subtitle2DrawerCssClass: '',
};

export default WidgetContainerTitleGroup;
