import PropTypes from 'prop-types';
import React, { useRef } from 'react';
import CitationDrawerContent from '../../../../../components/CitationDrawerContent';
import Drawer from '../../../../../components/Drawer';
import DrawerTriggerButton from '../../../../../components/DrawerTriggerButton';

export default function CitationDrawer({ citationNumber, bolded }) {
  const drawerTriggerRef = useRef(null);
  return (
    <>
      <DrawerTriggerButton
        customClass={bolded ? 'text-bold' : ''}
        drawerTriggerRef={drawerTriggerRef}
      >
        {citationNumber}
      </DrawerTriggerButton>
      <Drawer triggerRef={drawerTriggerRef} stickyHeader stickyFooter title="Monitoring citations">
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
