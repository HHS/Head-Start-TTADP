import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useModal, connectModal, Button } from '@trussworks/react-uswds';
import Modal from '../Modal';

const SomeComponent = () => {
  const { isOpen, openModal, closeModal } = useModal();
  const ConnectModal = connectModal(Modal);

  return (
    <div>
      <ConnectModal
        onUnlock={() => {}}
        onClose={() => {}}
        closeModal={closeModal}
        isOpen={isOpen}
      />
      <Button onClick={openModal}>Open</Button>
    </div>
  );
};

describe('Modal', () => {
  it('shows two buttons', async () => {
    // Given a page with a modal
    render(<Modal
      onUnlock={() => {}}
      onClose={() => {}}
      closeModal={() => {}}
      isOpen
    />);
    // When the modal is triggered
    const buttons = await screen.findAllByRole('button');

    // Then we see our options
    expect(buttons.length).toBe(2);
  });

  it('exits when escape key is pressed', async () => {
    // Given a page with a modal
    render(<SomeComponent />);

    // When the modal is triggered
    const button = await screen.findByText('Open');
    userEvent.click(button);

    const modal = await screen.findByTestId('modal');
    expect(modal).toBeVisible();

    // And the modal  can closeclose the modal via the escape key
    userEvent.type(modal, '{esc}', { skipClick: true });
    expect(screen.queryByTestId('modal')).not.toBeTruthy();
  });

  it('does not escape when any other key is pressed', async () => {
    // Given a page with a modal
    render(<SomeComponent />);

    // When the modal is triggered
    const button = await screen.findByText('Open');
    userEvent.click(button);

    const modal = await screen.findByTestId('modal');
    expect(modal).toBeVisible();

    // And the modal  can close the modal via the escape key
    userEvent.type(modal, '{enter}', { skipClick: true });
    expect(screen.queryByTestId('modal')).toBeTruthy();
  });
});
