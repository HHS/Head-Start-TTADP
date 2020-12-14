import '@testing-library/jest-dom';
import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen, act } from '@testing-library/react';

import Form from '../Form';

const renderForm = (saveForm, onContinue, onDirty) => render(
  <Form
    initialData={{ test: '' }}
    onContinue={onContinue}
    saveForm={saveForm}
    onDirty={onDirty}
    renderForm={(hookForm) => (
      <input
        type="radio"
        data-testid="input"
        ref={hookForm.ref}
        name="test"
      />
    )}
  />,
);

describe('Form', () => {
  it('calls saveForm when unmounted', () => {
    const saveForm = jest.fn();
    const onContinue = jest.fn();
    const dirty = jest.fn();
    const { unmount } = renderForm(saveForm, onContinue, dirty);
    unmount();
    expect(saveForm).toHaveBeenCalled();
  });

  it('calls onContinue when submitting', async () => {
    const saveForm = jest.fn();
    const onContinue = jest.fn();
    const dirty = jest.fn();

    renderForm(saveForm, onContinue, dirty);
    const submit = screen.getByRole('button');
    await act(async () => {
      userEvent.click(submit);
    });

    expect(onContinue).toHaveBeenCalled();
  });

  it('calls onDirty when the form is dirty', async () => {
    const saveForm = jest.fn();
    const onContinue = jest.fn();
    const dirty = jest.fn();

    renderForm(saveForm, onContinue, dirty);
    const submit = screen.getByTestId('input');
    userEvent.click(submit);

    expect(dirty).toHaveBeenCalled();
  });
});
