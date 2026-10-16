import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import NavigationPromptModal from '../NavigationPromptModal';

describe('NavigationPromptModal', () => {
  it('renders the prompt and forwards both choices', () => {
    const onContinueWithoutSaving = jest.fn();
    const onSaveAndContinue = jest.fn();

    render(
      <NavigationPromptModal
        isOpen
        isSaving={false}
        onContinueWithoutSaving={onContinueWithoutSaving}
        onSaveAndContinue={onSaveAndContinue}
        onDismiss={jest.fn()}
      />
    );

    expect(
      screen.getByRole('heading', { name: 'Are you sure you want to leave this page?' })
    ).toBeInTheDocument();
    expect(screen.getByText('You have unsaved preferences that will be lost.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Continue without saving' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save and continue' }));

    expect(onContinueWithoutSaving).toHaveBeenCalledTimes(1);
    expect(onSaveAndContinue).toHaveBeenCalledTimes(1);
  });

  it('closes when the open state changes to false', async () => {
    const props = {
      isSaving: false,
      onContinueWithoutSaving: jest.fn(),
      onSaveAndContinue: jest.fn(),
      onDismiss: jest.fn(),
    };
    const { rerender } = render(<NavigationPromptModal {...props} isOpen />);

    rerender(<NavigationPromptModal {...props} isOpen={false} />);

    await waitFor(() => {
      expect(screen.getByRole('dialog', { hidden: true })).toHaveClass('is-hidden');
    });
  });

  it('dismisses when the modal close button is clicked', () => {
    const onDismiss = jest.fn();

    const { container } = render(
      <NavigationPromptModal
        isOpen
        isSaving={false}
        onContinueWithoutSaving={jest.fn()}
        onSaveAndContinue={jest.fn()}
        onDismiss={onDismiss}
      />
    );

    const closeButton = container.ownerDocument.querySelector('.usa-modal__close');
    expect(closeButton).toBeInTheDocument();
    fireEvent.click(closeButton as HTMLElement);

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('dismisses when the modal overlay is clicked', () => {
    const onDismiss = jest.fn();

    render(
      <NavigationPromptModal
        isOpen
        isSaving={false}
        onContinueWithoutSaving={jest.fn()}
        onSaveAndContinue={jest.fn()}
        onDismiss={onDismiss}
      />
    );

    fireEvent.click(screen.getByTestId('modalOverlay'));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('disables both choices while saving', () => {
    render(
      <NavigationPromptModal
        isOpen
        isSaving
        onContinueWithoutSaving={jest.fn()}
        onSaveAndContinue={jest.fn()}
        onDismiss={jest.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Continue without saving' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save and continue' })).toBeDisabled();
  });
});
