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
  okEnabled,
  okButtonCss,
  cancelButtonCss,
}) => (
  <div className={`popup-modal ${showCloseX ? 'show-close-x' : ''}`}>
    <TrussWorksModal
      ref={modalRef}
      id={`${modalId}`}
      isLarge={isLarge}
      aria-labelledby={`${modalId}-heading`}
    >
      <ModalHeading className="font-sans" id={`${modalId}-heading`}>
        {title}
      </ModalHeading>
      <div>
        {children}
      </div>
      <ModalFooter>
        <ButtonGroup>
          <ModalToggleButton className={cancelButtonCss} data-focus="true" type="button" modalRef={modalRef} closer>
            {cancelButtonText}
          </ModalToggleButton>
          {
            showOkButton
              ? (
                <Button className={okButtonCss} disabled={!okEnabled} type="button" aria-label={okButtonAriaLabel} modalRef={modalRef} secondary onClick={onOk} closer>
                  {okButtonText}
                </Button>
              )
              : null
          }
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
  okEnabled: PropTypes.bool,
  okButtonCss: PropTypes.string,
  cancelButtonCss: PropTypes.string,
};

Modal.defaultProps = {
  onOk: () => { },
  okButtonAriaLabel: null,
  okButtonText: '',
  showCloseX: false,
  showOkButton: true,
  isLarge: false,
  cancelButtonText: 'Cancel',
  okEnabled: true,
  okButtonCss: null,
  cancelButtonCss: null,
};

export default Modal;
