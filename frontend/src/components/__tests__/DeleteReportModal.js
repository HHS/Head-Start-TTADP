import '@testing-library/jest-dom';
import React from 'react';
import {
  render, screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useModal, connectModal, Button } from '@trussworks/react-uswds';

import DeleteReportModal from '../DeleteReportModal';

const SomeComponent = () => {
  const { isOpen, openModal, closeModal } = useModal();
  const ConnectModal = connectModal(DeleteReportModal);

  return (
    <div>
      <ConnectModal
        onDelete={() => {}}
        onClose={() => {}}
        closeModal={closeModal}
        isOpen={isOpen}
      />
      <Button onClick={openModal}>Open</Button>
    </div>
  );
};

describe('DeleteReportModal', () => {
  it('shows two buttons', async () => {
    // Given a page with a modal
    render(<DeleteReportModal
      onDelete={() => {}}
      onClose={() => {}}
      closeModal={() => {}}
      isOpen
    />);
    // When the modal is triggered
    const buttons = await screen.findAllByRole('button');

    // Then we see our options
    expect(buttons.length).toBe(2);
  });

  it('exits when escapse key is pressed', async () => {
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
});
