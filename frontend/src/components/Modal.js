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
  isLarge,
  children,
}) => (
  <div className={`popup-modal ${showOkButton ? 'show-ok-button' : ''}  ${showCloseX ? 'show-close-x' : ''}`} aria-modal="true" role="dialog" id="popup-modal">
    <TrussWorksModal
      ref={modalRef}
      id={`${modalId}-modal-id`}
      isLarge={isLarge}
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
          <Button type="button" aria-label={okButtonAriaLabel} modalRef={modalRef} secondary onClick={onOk} closer>
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
    PropTypes.shape(),
  ]).isRequired,
  modalId: PropTypes.string.isRequired,
  onOk: PropTypes.func,
  title: PropTypes.string.isRequired,
  okButtonText: PropTypes.string,
  okButtonAriaLabel: PropTypes.string,
  showOkButton: PropTypes.bool,
  cancelButtonText: PropTypes.string,
  showCloseX: PropTypes.bool,
  isLarge: PropTypes.bool,
  children: PropTypes.node.isRequired,
};

Modal.defaultProps = {
  onOk: () => {},
  okButtonAriaLabel: null,
  okButtonText: '',
  showCloseX: false,
  showOkButton: true,
  isLarge: false,
  cancelButtonText: 'Cancel',

};

export default Modal;
