import React, { useCallback, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Button, Modal } from '@trussworks/react-uswds';
import { ESCAPE_KEY_CODES } from '../Constants';
import './UnlockReportModal.css';

const UnlockReportModal = ({
  onUnlock, onClose, closeModal,
}) => {
  const modalRef = useRef(null);

  const onEscape = useCallback((event) => {
    if (ESCAPE_KEY_CODES.includes(event.key)) {
      closeModal();
    }
  }, [closeModal]);

  useEffect(() => {
    document.addEventListener('keydown', onEscape, false);
    return () => {
      document.removeEventListener('keydown', onEscape, false);
    };
  }, [onEscape]);

  useEffect(() => {
    const button = modalRef.current.querySelector('button');
    if (button) {
      button.focus();
    }
  });

  return (
    <div ref={modalRef} aria-modal="true" role="dialog" id="unlockDialog">
      <Modal
        title={<h2>Unlock Activity Report</h2>}
        actions={(
          <>
            <Button type="button" onClick={onClose}>
              Cancel
            </Button>

            <Button type="button" secondary onClick={onUnlock}>
              Unlock
            </Button>
          </>
        )}
      >
        Are you sure you want to unlock this activity report?
        <br />
        <br />
        The report status will be set to
        {' '}
        <b>NEEDS ACTION</b>
        {' '}
        and
        {' '}
        <br />
        must be re-submitted for approval.
      </Modal>
    </div>
  );
};

UnlockReportModal.propTypes = {
  onUnlock: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  closeModal: PropTypes.func.isRequired,
};

export default UnlockReportModal;
