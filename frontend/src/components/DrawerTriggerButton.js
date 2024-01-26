import React from 'react';
import PropTypes from 'prop-types';
import './DrawerTriggerButton.css';

export default function DrawerTriggerButton({
  drawerTriggerRef,
  children,

}) {
  return (
    <button
      type="button"
      className="usa-button__drawer-trigger usa-button usa-button--unstyled margin-left-1"
      ref={drawerTriggerRef}
    >
      {children}
    </button>
  );
}

DrawerTriggerButton.propTypes = {
  drawerTriggerRef: PropTypes.shape({ current: PropTypes.instanceOf(Element) }).isRequired,
  children: PropTypes.node.isRequired,
};
