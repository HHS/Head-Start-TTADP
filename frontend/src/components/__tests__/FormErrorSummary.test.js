import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import FormErrorSummary, { errorMessages, FORM_ERROR_SUMMARY_TEXT } from '../FormErrorSummary';

const TestForm = () => {
  const hookForm = useForm({ defaultValues: { name: '', recipient: { id: null } } });
  const { register, handleSubmit, control } = hookForm;
  return (
    // eslint-disable-next-line react/jsx-props-no-spreading
    <FormProvider {...hookForm}>
      <form onSubmit={handleSubmit(() => {})}>
        <label htmlFor="name">Name</label>
        <input id="name" name="name" ref={register({ required: 'Enter a name' })} />
        <Controller
          name="recipient.id"
          control={control}
          rules={{ required: 'Select a recipient' }}
          render={() => <span />}
        />
        <FormErrorSummary />
        <button type="submit">Submit</button>
      </form>
    </FormProvider>
  );
};

describe('FormErrorSummary', () => {
  it('is hidden until the form is submitted', () => {
    render(<TestForm />);
    expect(screen.queryByText(FORM_ERROR_SUMMARY_TEXT)).toBeNull();
  });

  it('lists every error, nested ones included, after a failed submit', async () => {
    render(<TestForm />);
    userEvent.click(screen.getByRole('button', { name: 'Submit' }));

    const summary = await screen.findByTestId('form-error-summary');
    expect(summary).toHaveTextContent(FORM_ERROR_SUMMARY_TEXT);
    expect(summary).toHaveTextContent('Enter a name');
    expect(summary).toHaveTextContent('Select a recipient');
  });

  it('drops an error once its field is fixed', async () => {
    render(<TestForm />);
    userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    await screen.findByTestId('form-error-summary');

    userEvent.type(screen.getByLabelText('Name'), 'Ross');

    await waitFor(() =>
      expect(screen.getByTestId('form-error-summary')).not.toHaveTextContent('Enter a name')
    );
    expect(screen.getByTestId('form-error-summary')).toHaveTextContent('Select a recipient');
  });

  it('lists a message shared by several fields once', () => {
    expect(
      errorMessages({
        a: { type: 'required', message: 'Required' },
        b: [{ type: 'required', message: 'Required' }],
        c: { nested: { type: 'manual', message: 'Other' } },
      })
    ).toEqual(['Required', 'Other']);
  });
});
