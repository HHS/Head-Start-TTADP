import { render, screen } from '@testing-library/react';
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

function renderRow(props = {}) {
  function Wrapper() {
    const methods = useForm();

    return (
      <FormProvider {...methods}>
        <NotificationsRow id="Approved" label="Approved reports" {...props} />
      </FormProvider>
    );
  }

  return render(<Wrapper />);
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
});
