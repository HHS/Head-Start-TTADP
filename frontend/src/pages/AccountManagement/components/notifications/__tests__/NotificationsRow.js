import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import NotificationsRow from '../NotificationsRow';

const frequencyOptions = [
  { key: 'never', label: 'Do not notify me' },
  { key: 'immediately', label: 'Immediately' },
  { key: 'today', label: 'Daily digest' },
  { key: 'this week', label: 'Weekly digest' },
  { key: 'this month', label: 'Monthly digest' },
];

function renderRow(props = {}, formProps = {}) {
  const formRef = {};
  const setDisplayAlert = jest.fn();

  function Wrapper() {
    const methods = useForm(formProps);
    formRef.methods = methods;

    return (
      <FormProvider {...methods}>
        <NotificationsRow
          id="Approved"
          label="Approved reports"
          emailVerified={true}
          setDisplayAlert={setDisplayAlert}
          {...props}
        />
      </FormProvider>
    );
  }

  const utils = render(<Wrapper />);
  return { ...utils, formRef, setDisplayAlert };
}

describe('NotificationsRow', () => {
  it('renders the label text', () => {
    renderRow();

    expect(screen.getByText('Approved reports')).toBeInTheDocument();
  });

  it('renders an in-app checkbox by default', () => {
    const { container } = renderRow();

    const checkbox = container.querySelector('#inAppApproved');

    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toHaveAttribute('type', 'checkbox');
  });

  it('does not render the in-app checkbox when hideInApp is true', () => {
    const { container } = renderRow({ hideInApp: true });

    expect(container.querySelector('#inAppApproved')).not.toBeInTheDocument();
  });

  it('renders the email dropdown with all frequency options', () => {
    renderRow();

    const dropdown = screen.getByLabelText('Email');

    expect(dropdown).toHaveAttribute('id', 'emailApproved');

    frequencyOptions.forEach(({ label, key }) => {
      expect(screen.getByRole('option', { name: label })).toHaveValue(key);
    });
  });

  it('renders a width-10 spacer when hideInApp is true', () => {
    const { container } = renderRow({ hideInApp: true });

    const spacer = container.querySelector('div.width-10');

    expect(spacer).toBeInTheDocument();
    expect(spacer.querySelector('input')).toBeNull();
  });

  describe('email verification gating', () => {
    it('does not update the displayed value or form state when email is unverified', () => {
      const { formRef, setDisplayAlert } = renderRow(
        { emailVerified: false },
        { defaultValues: { emailApproved: 'never' } }
      );

      const dropdown = screen.getByLabelText('Email');
      expect(dropdown).toHaveValue('never');

      fireEvent.change(dropdown, { target: { value: 'this week' } });

      expect(setDisplayAlert).toHaveBeenCalledWith(true);
      expect(dropdown).toHaveValue('never');
      expect(formRef.methods.getValues('emailApproved')).toBe('never');
    });

    it('updates the displayed value and form state when email is verified', () => {
      const { formRef, setDisplayAlert } = renderRow(
        { emailVerified: true },
        { defaultValues: { emailApproved: 'never' } }
      );

      const dropdown = screen.getByLabelText('Email');

      fireEvent.change(dropdown, { target: { value: 'this week' } });

      expect(dropdown).toHaveValue('this week');
      expect(formRef.methods.getValues('emailApproved')).toBe('this week');
      expect(setDisplayAlert).not.toHaveBeenCalled();
    });
  });

  describe('controlled in-app checkbox', () => {
    it('reflects programmatic setValue updates on its form field', () => {
      const { formRef, container } = renderRow({}, { defaultValues: { inAppApproved: true } });

      const checkbox = container.querySelector('#inAppApproved');
      expect(checkbox).toBeChecked();

      act(() => {
        formRef.methods.setValue('inAppApproved', false);
      });

      expect(checkbox).not.toBeChecked();

      act(() => {
        formRef.methods.setValue('inAppApproved', true);
      });

      expect(checkbox).toBeChecked();
    });

    it('updates form state when the user toggles the checkbox', () => {
      const { formRef, container } = renderRow({}, { defaultValues: { inAppApproved: true } });

      const checkbox = container.querySelector('#inAppApproved');

      fireEvent.click(checkbox);

      expect(checkbox).not.toBeChecked();
      expect(formRef.methods.getValues('inAppApproved')).toBe(false);

      fireEvent.click(checkbox);

      expect(checkbox).toBeChecked();
      expect(formRef.methods.getValues('inAppApproved')).toBe(true);
    });
  });
});
