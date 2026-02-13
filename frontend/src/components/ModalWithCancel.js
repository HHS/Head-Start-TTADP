import React from 'react'
import PropTypes from 'prop-types'
import { Button, Modal as TrussWorksModal, ModalHeading, ModalFooter, ButtonGroup, ModalToggleButton } from '@trussworks/react-uswds'
import './Modal.css'

const ModalWithCancel = ({
  modalRef,
  modalId,
  onOk,
  onCancel,
  title,
  okButtonText,
  cancelButtonText,
  children,
  okButtonCss,
  cancelButtonCss,
  isLarge,
  forceAction,
}) => {
  const handleCancel = (e) => {
    if (onCancel) onCancel(e)
    if (modalRef?.current) {
      modalRef.current.toggleModal()
    }
  }

  const handleOk = (e) => {
    if (onOk) onOk(e)
    if (modalRef?.current) {
      modalRef.current.toggleModal()
    }
  }

  return (
    <TrussWorksModal
      ref={modalRef}
      id={modalId}
      isLarge={isLarge}
      aria-labelledby={`${modalId}-heading`}
      forceAction={forceAction}
      className="ttahub-modal"
    >
      <div className="display-flex">
        <ModalHeading className="font-sans margin-0 display-flex" id={`${modalId}-heading`}>
          {title}
        </ModalHeading>
      </div>

      <div>{children}</div>

      <ModalFooter>
        <ButtonGroup>
          <Button className={okButtonCss || 'usa-button usa-button--secondary'} onClick={handleOk} type="button">
            {okButtonText || 'Continue'}
          </Button>
          <ModalToggleButton className={cancelButtonCss || 'usa-button'} modalRef={modalRef} closer type="button" onClick={handleCancel}>
            {cancelButtonText || 'Cancel'}
          </ModalToggleButton>
        </ButtonGroup>
      </ModalFooter>
    </TrussWorksModal>
  )
}

ModalWithCancel.propTypes = {
  modalRef: PropTypes.shape({
    current: PropTypes.oneOfType([PropTypes.instanceOf(Element), PropTypes.instanceOf(HTMLElement)]),
  }),
  modalId: PropTypes.string.isRequired,
  onOk: PropTypes.func,
  onCancel: PropTypes.func,
  title: PropTypes.string.isRequired,
  okButtonText: PropTypes.string,
  cancelButtonText: PropTypes.string,
  children: PropTypes.node.isRequired,
  okButtonCss: PropTypes.string,
  cancelButtonCss: PropTypes.string,
  isLarge: PropTypes.bool,
  forceAction: PropTypes.bool,
}

ModalWithCancel.defaultProps = {
  modalRef: null,
  onOk: null,
  onCancel: null,
  okButtonText: 'OK',
  cancelButtonText: 'Cancel',
  okButtonCss: '',
  cancelButtonCss: '',
  isLarge: false,
  forceAction: false,
}

export default ModalWithCancel
