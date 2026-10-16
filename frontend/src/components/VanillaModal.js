import { Modal, ModalHeading } from '@trussworks/react-uswds';
import PropTypes from 'prop-types';
import React, { useEffect } from 'react';

export default function VanillaModal({
  heading,
  children,
  modalRef,
  className,
  id,
  forceAction,
  onClose,
}) {
  // strip everything but letters and numbers
  const regex = /[^a-zA-Z0-9]/g;

  const textForHeadingId = id || heading;
  const modalId = `modal-${textForHeadingId.toLowerCase().replace(regex, '-')}`;
  const handleClick = (event) => {
    if (event.target.closest?.('.usa-modal__close')) {
      onClose?.();
    }
  };
  // The overlay closes the modal on click but sits outside the element that receives
  // our props, so listen at the document level to keep callers in sync with it.
  useEffect(() => {
    if (!onClose || forceAction) return undefined;
    const handleOverlayClick = (event) => {
      if (event.target.matches?.(`.usa-modal-overlay[aria-controls="${modalId}"]`)) {
        onClose();
      }
    };
    // USWDS closes on document capture, before React key handlers can read the open state.
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && modalRef.current?.modalIsOpen) {
        onClose();
      }
    };
    document.addEventListener('click', handleOverlayClick);
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('click', handleOverlayClick);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [forceAction, modalId, modalRef, onClose]);

  return (
    <Modal
      className={`ttahub-vanilla-modal ${className}`}
      ref={modalRef}
      id={modalId}
      aria-labelledby={`${modalId}-heading`}
      aria-describedby={`${modalId}-description`}
      forceAction={forceAction}
      onClick={handleClick}
    >
      <ModalHeading id={`${modalId}-heading`}>{heading}</ModalHeading>
      <div id={`${modalId}-description`}>{children}</div>
    </Modal>
  );
}

VanillaModal.propTypes = {
  heading: PropTypes.oneOfType([PropTypes.string, PropTypes.node]).isRequired,
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  modalRef: PropTypes.oneOfType([PropTypes.func, PropTypes.shape()]).isRequired,
  id: PropTypes.string,
  forceAction: PropTypes.bool,
  onClose: PropTypes.func,
};

VanillaModal.defaultProps = {
  className: '',
  id: '',
  forceAction: false,
};
