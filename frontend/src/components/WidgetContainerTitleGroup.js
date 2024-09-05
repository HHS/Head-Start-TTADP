import React from 'react';
import PropTypes from 'prop-types';
import ContextMenu from './ContextMenu';
import DisplayTableToggle from './DisplayTableToggleButton';

const WidgetContainerTitleGroup = ({
  children,
  title,
  showHeaderBorder,
  subtitle,
  className,
  pagination,
  enableCheckboxes,
  exportRows,
  displayTable,
  setDisplayTable,
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
          <h2 className="smart-hub--table-widget-heading margin-0 margin-y-2 font-sans-lg">{title}</h2>
          {subtitle ? <p className="usa-prose margin-x-0 margin-y-2">{subtitle}</p> : null }
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
        {
        (menuItems.length > 0 && (
        <ContextMenu
          menuItems={menuItems}
          label="Export actions for courses"
        />
        ))
      }
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
  enableCheckboxes: PropTypes.bool,
  exportRows: PropTypes.func,
  displayTable: PropTypes.bool,
  setDisplayTable: PropTypes.func,
};

WidgetContainerTitleGroup.defaultProps = {
  children: null,
  pagination: null,
  title: '',
  subtitle: '',
  showHeaderBorder: false,
  className: 'padding-3 ',
  enableCheckboxes: false,
  exportRows: null,
  displayTable: false,
  setDisplayTable: null,
};

export default WidgetContainerTitleGroup;
