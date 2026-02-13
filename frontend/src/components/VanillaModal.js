import React from 'react'
import PropTypes from 'prop-types'
import { Modal, ModalHeading } from '@trussworks/react-uswds'

export default function VanillaModal({ heading, children, modalRef, className, id, forceAction }) {
  // strip everything but letters and numbers
  const regex = /[^a-zA-Z0-9]/g

  const textForHeadingId = id || heading
  const modalId = `modal-${textForHeadingId.toLowerCase().replace(regex, '-')}`

  return (
    <Modal
      className={`ttahub-vanilla-modal ${className}`}
      ref={modalRef}
      id={modalId}
      aria-labelledby={`${modalId}-heading`}
      aria-describedby={`${modalId}-description`}
      forceAction={forceAction}
    >
      <ModalHeading id={`${modalId}-heading`}>{heading}</ModalHeading>
      <div id={`${modalId}-description`}>{children}</div>
    </Modal>
  )
}

VanillaModal.propTypes = {
  heading: PropTypes.oneOfType([PropTypes.string, PropTypes.node]).isRequired,
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  modalRef: PropTypes.oneOfType([PropTypes.func, PropTypes.shape()]).isRequired,
  id: PropTypes.string,
  forceAction: PropTypes.bool,
}

VanillaModal.defaultProps = {
  className: '',
  id: '',
  forceAction: false,
}
