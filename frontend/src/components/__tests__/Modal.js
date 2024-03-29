/* eslint-disable react/prop-types */
import '@testing-library/jest-dom';
import React, { useRef } from 'react';
import {
  render, screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModalToggleButton, Button } from '@trussworks/react-uswds';
import Modal from '../Modal';

const ModalComponent = (
  {
    onOk = () => { },
    modalIdValue = 'popup-modal',
    title = 'Test Report Modal',
    okButtonText = 'Ok',
    okButtonAriaLabel = 'This button will ok the modal action.',
    showOkButton = true,
    cancelButtonText = 'Cancel',
    showCloseX = false,
    isLarge = false,
    SecondaryActionButton = null,
    onSecondaryAction = () => {},
    hideCancelButton = false,
  },
) => {
  const modalRef = useRef();
  return (
    <div>
      <ModalToggleButton modalRef={modalRef} opener>Open</ModalToggleButton>
      <ModalToggleButton modalRef={modalRef} closer>Close</ModalToggleButton>
      <Modal
        modalRef={modalRef}
        onOk={onOk}
        modalId={modalIdValue}
        title={title}
        okButtonText={okButtonText}
        okButtonAriaLabel={okButtonAriaLabel}
        showOkButton={showOkButton}
        cancelButtonText={cancelButtonText}
        showCloseX={showCloseX}
        isLarge={isLarge}
        SecondaryActionButton={SecondaryActionButton}
        onSecondaryAction={onSecondaryAction}
        hideCancelButton={hideCancelButton}
      >
        <div>
          Are you sure you want to perform this action?
        </div>
      </Modal>
    </div>
  );
};

describe('Modal', () => {
  it('correctly hides and shows', async () => {
    render(<ModalComponent />);

    // Defaults modal to hidden.
    let modalElement = document.querySelector('#popup-modal');
    expect(modalElement).toHaveClass('is-hidden');

    // Open modal.
    const button = await screen.findByText('Open');
    userEvent.click(button);

    // Check modal is visible.
    modalElement = document.querySelector('#popup-modal');
    expect(modalElement).toHaveClass('is-visible');
  });

  it('exits when escape key is pressed', async () => {
    render(<ModalComponent />);

    // Open modal.
    const button = await screen.findByText('Open');
    userEvent.click(button);

    // Modal is visible.
    let modalElement = document.querySelector('#popup-modal');
    expect(modalElement).toHaveClass('is-visible');

    // Press ESC.
    userEvent.type(modalElement, '{esc}', { skipClick: true });

    // Check Modal is hidden.
    modalElement = document.querySelector('#popup-modal');
    expect(modalElement).toHaveClass('is-hidden');
  });

  it('does not escape when any other key is pressed', async () => {
    render(<ModalComponent />);

    // Open modal.
    const button = await screen.findByText('Open');
    userEvent.click(button);

    // Modal is open.
    let modalElement = document.querySelector('#popup-modal');
    expect(modalElement).toHaveClass('is-visible');

    // Press ENTER.
    userEvent.type(modalElement, '{enter}', { skipClick: true });

    // Modal is still open.
    modalElement = document.querySelector('#popup-modal');
    expect(modalElement).toHaveClass('is-visible');
  });

  it('hides ok button', async () => {
    render(<ModalComponent showOkButton={false} showCloseX />);
    expect(screen.queryByRole('button', { name: /this button will ok the modal action\./i })).not.toBeInTheDocument();
  });

  it('shows secondary ok button', async () => {
    const secondaryOk = jest.fn();
    const secondaryButton = () => <Button type="button" onClick={secondaryOk}>my secondary button</Button>;
    render(<ModalComponent SecondaryActionButton={secondaryButton} />);
    expect(await screen.findByText(/my secondary button/i)).toBeVisible();

    // Click secondary OK.
    const secondaryOkBtn = await screen.findByText(/my secondary button/i);
    userEvent.click(secondaryOkBtn);
    expect(secondaryOk).toHaveBeenCalled();
  });

  it('hides the cancel button', async () => {
    render(<ModalComponent hideCancelButton />);
    expect(screen.queryByText(/cancel/i)).toBeNull();
  });
});
