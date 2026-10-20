import PropTypes from 'prop-types';
import React from 'react';
import ContentFromFeedByTag from './ContentFromFeedByTag';
import Drawer from './Drawer';

export default function SupportTypeDrawer({ drawerTriggerRef }) {
  return (
    <Drawer triggerRef={drawerTriggerRef} stickyHeader stickyFooter title="Support type guidance">
      <ContentFromFeedByTag
        openLinksInNewTab
        className="ttahub-drawer--objective-support-type-guidance"
        tagName="ttahub-tta-support-type"
      />
    </Drawer>
  );
}

SupportTypeDrawer.propTypes = {
  drawerTriggerRef: PropTypes.shape({ current: PropTypes.instanceOf(Element) }).isRequired,
};
