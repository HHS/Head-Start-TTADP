import React from 'react';
import PropTypes from 'prop-types';
import {
  Button, Modal as TrussWorksModal, ModalHeading, ModalFooter, ButtonGroup, ModalToggleButton,
} from '@trussworks/react-uswds';
import './Modal.css';

const Modal = ({
  modalRef,
  modalId,
  onOk,
  title,
  okButtonText,
  okButtonAriaLabel,
  showOkButton,
  cancelButtonText,
  showCloseX,
  children,
}) => (
  <div className={`popup-modal ${showOkButton ? 'show-ok-button' : ''}  ${showCloseX ? 'show-close-x' : ''}`} aria-modal="true" role="dialog" id="popup-modal">
    <TrussWorksModal
      ref={modalRef}
      id={`${modalId}-modal-id`}
    >
      <ModalHeading className="font-sans" id={`${modalId}-modal-id-heading`}>
        {title}
      </ModalHeading>
      <div>
        {children}
      </div>
      <ModalFooter>
        <ButtonGroup>
          <ModalToggleButton data-focus="true" type="button" modalRef={modalRef} closer>
            {cancelButtonText}
          </ModalToggleButton>
          <Button type="button" aria-label={okButtonAriaLabel} secondary onClick={onOk}>
            {okButtonText}
          </Button>
        </ButtonGroup>
      </ModalFooter>
    </TrussWorksModal>
  </div>
);

Modal.propTypes = {
  modalRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({ current: PropTypes.elementType }),
  ]).isRequired,
  modalId: PropTypes.number.isRequired,
  onOk: PropTypes.func,
  title: PropTypes.string.isRequired,
  okButtonText: PropTypes.string,
  okButtonAriaLabel: PropTypes.string,
  showOkButton: PropTypes.bool,
  cancelButtonText: PropTypes.string,
  showCloseX: PropTypes.bool,
  children: PropTypes.node.isRequired,
};

Modal.defaultProps = {
  onOk: () => {},
  okButtonAriaLabel: null,
  okButtonText: '',
  showCloseX: false,
  showOkButton: true,
  cancelButtonText: 'Cancel',

};

export default Modal;
