import '@testing-library/jest-dom';
import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen, act } from '@testing-library/react';

import Form from '../Form';

const renderForm = (saveForm, onSubmit, onDirty) => render(
  <Form
    initialData={{ test: '' }}
    onSubmit={onSubmit}
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
    const onSubmit = jest.fn();
    const dirty = jest.fn();
    const { unmount } = renderForm(saveForm, onSubmit, dirty);
    unmount();
    expect(saveForm).toHaveBeenCalled();
  });

  it('calls onSubmit when submitting', async () => {
    const saveForm = jest.fn();
    const onSubmit = jest.fn();
    const dirty = jest.fn();

    renderForm(saveForm, onSubmit, dirty);
    const submit = screen.getByRole('button');
    await act(async () => {
      userEvent.click(submit);
    });

    expect(onSubmit).toHaveBeenCalled();
  });

  it('calls onDirty when the form is dirty', async () => {
    const saveForm = jest.fn();
    const onSubmit = jest.fn();
    const dirty = jest.fn();

    renderForm(saveForm, onSubmit, dirty);
    const submit = screen.getByTestId('input');
    userEvent.click(submit);

    expect(dirty).toHaveBeenCalled();
  });
});
