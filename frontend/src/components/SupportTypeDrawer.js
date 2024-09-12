import React from 'react';
import PropTypes from 'prop-types';
import Drawer from './Drawer';
import ContentFromFeedByTag from './ContentFromFeedByTag';

export default function SupportTypeDrawer({
  drawerTriggerRef,
}) {
  return (
    <Drawer
      triggerRef={drawerTriggerRef}
      stickyHeader
      stickyFooter
      title="Support type guidance"
    >
      <ContentFromFeedByTag className="ttahub-drawer--objective-support-type-guidance" tagName="ttahub-tta-support-type" contentSelector="table" />
    </Drawer>
  );
}

SupportTypeDrawer.propTypes = {
  drawerTriggerRef: PropTypes.shape({ current: PropTypes.instanceOf(Element) }).isRequired,
};
