import React, { useCallback, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Button, Modal } from '@trussworks/react-uswds';

import { ESCAPE_KEY_CODES } from '../Constants';
import './DeleteReportModal.css';

const DeleteModal = ({
  onDelete, onClose, closeModal,
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
    <div ref={modalRef} aria-modal="true" role="dialog" id="deleteDialog">
      <Modal
        title={<h2>Delete Activity Report</h2>}
        actions={(
          <>
            <Button type="button" onClick={onClose}>
              Cancel
            </Button>

            <Button type="button" secondary onClick={onDelete}>
              Delete
            </Button>
          </>
        )}
      >
        Are you sure you want to delete this activity report?
        <br />
        This action
        {' '}
        <b>cannot</b>
        {' '}
        be undone.
      </Modal>
    </div>
  );
};

DeleteModal.propTypes = {
  onDelete: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  closeModal: PropTypes.func.isRequired,
};

export default DeleteModal;
