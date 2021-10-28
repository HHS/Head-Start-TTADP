import React, { useCallback, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Button, Modal as TrussWorksModal } from '@trussworks/react-uswds';
import { ESCAPE_KEY_CODES } from '../Constants';
import './Modal.css';

const Modal = ({
  onOk, onClose, closeModal, title, okButtonText, okButtonAriaLabel, children,
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
    <div className="popup-modal" ref={modalRef} aria-modal="true" role="dialog" id="popup-modal">
      <TrussWorksModal
        title={<h2>{title}</h2>}
        actions={(
          <>
            <Button type="button" onClick={onClose}>
              Cancel
            </Button>

            <Button type="button" aria-label={okButtonAriaLabel} secondary onClick={onOk}>
              {okButtonText}
            </Button>
          </>
        )}
      >
        {children}
      </TrussWorksModal>
    </div>
  );
};

Modal.propTypes = {
  onOk: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  closeModal: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  okButtonText: PropTypes.string.isRequired,
  okButtonAriaLabel: PropTypes.string,
  children: PropTypes.node.isRequired,
};

Modal.defaultProps = {
  okButtonAriaLabel: null,
};

export default Modal;
