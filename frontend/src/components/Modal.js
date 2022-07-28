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
  okButtonCss,
  cancelButtonCss,
  showTitleRequired,
  SecondaryActionButton,
  hideCancelButton,
  forceAction,
}) => (
  <>
    <TrussWorksModal
      ref={modalRef}
      id={`${modalId}`}
      isLarge={isLarge}
      aria-labelledby={`${modalId}-heading`}
      forceAction={forceAction}
      className={`ttahub-modal ${showCloseX ? 'show-close-x' : ''}`}
    >
      <div className="display-flex">
        <ModalHeading className="font-sans margin-0 display-flex" id={`${modalId}-heading`}>
          {title}
        </ModalHeading>
        {showTitleRequired ? (
          <span className="display-flex smart-hub--form-required padding-left-1">(required)</span>
        ) : null }
      </div>
      <div>
        {children}
      </div>
      <ModalFooter>
        <ButtonGroup>
          {
            showOkButton
              ? (
                <Button className={okButtonCss || 'usa-button usa-button--secondary usa-button'} data-focus={hideCancelButton} type="button" aria-label={okButtonAriaLabel} onClick={onOk}>
                  {okButtonText}
                </Button>
              )
              : null
          }
          {
            SecondaryActionButton
              ? <SecondaryActionButton />
              : null
            }
          {
            !hideCancelButton
              ? (
                <ModalToggleButton className={cancelButtonCss} data-focus="true" type="button" modalRef={modalRef} closer>
                  {cancelButtonText}
                </ModalToggleButton>
              )
              : null
          }
        </ButtonGroup>
      </ModalFooter>
    </TrussWorksModal>
  </>
);

Modal.propTypes = {
  modalRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape(),
  ]).isRequired,
  modalId: PropTypes.string.isRequired,
  onOk: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  okButtonText: PropTypes.string,
  okButtonAriaLabel: PropTypes.string,
  showOkButton: PropTypes.bool,
  cancelButtonText: PropTypes.string,
  showCloseX: PropTypes.bool,
  isLarge: PropTypes.bool,
  children: PropTypes.node.isRequired,
  okButtonCss: PropTypes.string,
  cancelButtonCss: PropTypes.string,
  showTitleRequired: PropTypes.bool,
  SecondaryActionButton: PropTypes.oneOfType([PropTypes.func, PropTypes.bool]),
  hideCancelButton: PropTypes.bool,
  forceAction: PropTypes.bool,
};

Modal.defaultProps = {
  okButtonAriaLabel: null,
  okButtonText: '',
  showCloseX: false,
  showOkButton: true,
  isLarge: false,
  cancelButtonText: 'Cancel',
  okButtonCss: null,
  cancelButtonCss: null,
  showTitleRequired: false,
  SecondaryActionButton: false,
  hideCancelButton: false,
  forceAction: false,
};

export default Modal;
