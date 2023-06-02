import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeading } from '@trussworks/react-uswds';

export default function VanillaModal({
  heading,
  children,
  modalRef,
  className,
}) {
  const modalId = `modal-${heading.toLowerCase().replace(/\s/g, '-')}`;

  return (
    <Modal
      className={`ttahub-vanilla-modal ${className}`}
      ref={modalRef}
      id={modalId}
      aria-labelledby={`${modalId}-heading`}
      aria-describedby={`${modalId}-description`}
    >
      <ModalHeading id={`${modalId}-heading`}>
        {heading}
      </ModalHeading>
      <div id={`${modalId}-description`}>
        {children}
      </div>
    </Modal>
  );
}

VanillaModal.propTypes = {
  heading: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  modalRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape(),
  ]).isRequired,
};

VanillaModal.defaultProps = {
  className: '',
};
