import { Button } from '@trussworks/react-uswds';
import type { ModalRef } from '@trussworks/react-uswds/lib/components/Modal/Modal';
import React, { useEffect, useRef } from 'react';
import VanillaModal from './VanillaModal';

interface NavigationPromptModalProps {
  isOpen: boolean;
  isSaving: boolean;
  onContinueWithoutSaving: () => void;
  onSaveAndContinue: () => void;
  onDismiss: () => void;
}

export default function NavigationPromptModal({
  isOpen,
  isSaving,
  onContinueWithoutSaving,
  onSaveAndContinue,
  onDismiss,
}: NavigationPromptModalProps): JSX.Element {
  const modalRef = useRef<ModalRef>(null);

  useEffect(() => {
    modalRef.current?.toggleModal(undefined, isOpen);
  }, [isOpen]);

  return (
    <VanillaModal
      className="maxw-mobile-lg"
      forceAction={false}
      heading="Are you sure you want to leave this page?"
      id="navigation-prompt"
      modalRef={modalRef}
      onClose={onDismiss}
    >
      <p className="margin-top-0">You have unsaved preferences that will be lost.</p>
      <div className="display-flex flex-justify">
        <Button
          type="button"
          className="usa-button--secondary margin-right-2"
          disabled={isSaving}
          onClick={onContinueWithoutSaving}
        >
          Continue without saving
        </Button>
        <Button
          type="button"
          disabled={isSaving}
          onClick={onSaveAndContinue}
          className="padding-x-105"
        >
          Save and continue
        </Button>
      </div>
    </VanillaModal>
  );
}
