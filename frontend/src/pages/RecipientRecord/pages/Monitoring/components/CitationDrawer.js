import React, { useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import Drawer from '../../../../../components/Drawer';
import DrawerTriggerButton from '../../../../../components/DrawerTriggerButton';
import CitationDrawerContent from '../../../../../components/CitationDrawerContent';
import { fetchCitationTextByName } from '../../../../../fetchers/citations';
import useFetchNoLoading from '../../../../../hooks/useFetchNoLoading';

export default function CitationDrawer({ citationNumber, bolded }) {
  const drawerTriggerRef = useRef(null);

  const fetcher = useCallback(
    () => fetchCitationTextByName([citationNumber]),
    [citationNumber],
  );
  const { data: content } = useFetchNoLoading([], fetcher, [citationNumber]);

  return (
    <>
      <DrawerTriggerButton
        customClass={bolded ? 'text-bold' : ''}
        drawerTriggerRef={drawerTriggerRef}
      >
        {citationNumber}
      </DrawerTriggerButton>
      <Drawer
        triggerRef={drawerTriggerRef}
        stickyHeader
        stickyFooter
        title="Monitoring citations"
      >
        <CitationDrawerContent citations={content} />
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
