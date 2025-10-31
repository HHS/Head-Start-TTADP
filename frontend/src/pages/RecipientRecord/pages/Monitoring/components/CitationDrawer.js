import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import Drawer from '../../../../../components/Drawer';
import DrawerTriggerButton from '../../../../../components/DrawerTriggerButton';
import CitationDrawerContent from '../../../../../components/CitationDrawerContent';

export default function CitationDrawer({ citationNumber, bolded }) {
  const drawerTriggerRef = useRef(null);

  useEffect(() => {
    if (drawerTriggerRef.current) {
    drawerTriggerRef.current.focus();
  }
  }, [citationNumber]);

  return (
    <>
      <DrawerTriggerButton customClass={bolded ? 'text-bold' : ''} drawerTriggerRef={drawerTriggerRef}>
        {citationNumber}
      </DrawerTriggerButton>
      <Drawer
        triggerRef={drawerTriggerRef}
        stickyHeader
        stickyFooter
        title="Monitoring citations"
      >
        <CitationDrawerContent citations={[citationNumber]} />
      </Drawer>
    </>
  );
}

CitationDrawer.propTypes = {
  citationNumber: PropTypes.string.isRequired,
  bolded: PropTypes.bool,
};

CitationDrawer.defaultProps = {
  bolded: false,
};
