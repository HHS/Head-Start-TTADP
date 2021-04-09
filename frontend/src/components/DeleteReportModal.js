import React, { useCallback, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Button, Modal } from '@trussworks/react-uswds';

import { ESCAPE_KEY_CODE } from '../Constants';

const DeleteModal = ({
  onDelete, onClose, isOpen, closeModal,
}) => {
  const modalRef = useRef(null);

  const onEscape = useCallback((event) => {
    if (event.keyCode === ESCAPE_KEY_CODE) {
      closeModal();
    }
  }, [isOpen]);

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
    <div ref={modalRef} aria-modal="true" role="dialog">
      <Modal
        title={<h3>Delete Activity Report</h3>}
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
        This action can only be undone by a TTA Smart Hub Administrator
      </Modal>
    </div>
  );
};

DeleteModal.propTypes = {
  onDelete: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  isOpen: PropTypes.bool.isRequired,
  closeModal: PropTypes.func.isRequired,
};

export default DeleteModal;
