import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModalToggleButton } from '@trussworks/react-uswds';
import type { ModalRef } from '@trussworks/react-uswds/lib/components/Modal/Modal';
import React, { useRef } from 'react';
import VanillaModal from '../VanillaModal';

function TestModal({
  onClose,
  forceAction = false,
}: {
  onClose: () => void;
  forceAction?: boolean;
}) {
  const modalRef = useRef<ModalRef>(null);

  return (
    <>
      <ModalToggleButton modalRef={modalRef} opener>
        Open modal
      </ModalToggleButton>
      <VanillaModal
        heading="Test modal"
        modalRef={modalRef}
        forceAction={forceAction}
        onClose={onClose}
      >
        <button type="button">Modal action</button>
      </VanillaModal>
    </>
  );
}

describe('VanillaModal Escape dismissal', () => {
  it('notifies the caller exactly once when Escape closes an open modal', () => {
    const onClose = jest.fn();
    render(<TestModal onClose={onClose} />);
    userEvent.click(screen.getByRole('button', { name: 'Open modal' }));
    userEvent.click(screen.getByRole('button', { name: 'Modal action' }));

    userEvent.keyboard('{Escape}');

    expect(screen.getByRole('dialog', { hidden: true })).toHaveClass('is-hidden');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not dismiss a force-action modal on Escape', () => {
    const onClose = jest.fn();
    render(<TestModal onClose={onClose} forceAction />);
    userEvent.click(screen.getByRole('button', { name: 'Open modal' }));
    userEvent.click(screen.getByRole('button', { name: 'Modal action' }));

    userEvent.keyboard('{Escape}');

    expect(screen.getByRole('dialog')).toHaveClass('is-visible');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('ignores other keys and Escape while the modal is closed', () => {
    const onClose = jest.fn();
    render(<TestModal onClose={onClose} />);

    userEvent.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();

    userEvent.click(screen.getByRole('button', { name: 'Open modal' }));
    userEvent.keyboard('{Enter}');

    expect(screen.getByRole('dialog')).toHaveClass('is-visible');
    expect(onClose).not.toHaveBeenCalled();
  });
});
