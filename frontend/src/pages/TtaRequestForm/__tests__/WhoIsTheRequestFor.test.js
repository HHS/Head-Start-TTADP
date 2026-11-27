import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { defaultValues } from '../constants';
import WhoIsTheRequestFor from '../WhoIsTheRequestFor';

function Wrapper({ formOptions = {}, ...props }) {
  const hookForm = useForm({ mode: 'onBlur', defaultValues, ...formOptions });
  return (
    // eslint-disable-next-line react/jsx-props-no-spreading
    <FormProvider {...hookForm}>
      {/* eslint-disable-next-line react/jsx-props-no-spreading */}
      <WhoIsTheRequestFor {...props} />
    </FormProvider>
  );
}

describe('WhoIsTheRequestFor', () => {
  it('asks nothing about grants until there is a recipient to ask about', () => {
    render(<Wrapper />);

    expect(screen.getByRole('heading', { name: 'Who is the request for?' })).toBeVisible();
    // neither entry point supplied a recipient, so there is nothing to choose between
    expect(screen.queryByLabelText(/^recipient$/i)).toBeNull();
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(screen.queryByTestId('read-only-value')).toBeNull();

    expect(screen.getByRole('radio', { name: 'Yes' })).toBeVisible();
    expect(screen.getByRole('radio', { name: 'No' })).toBeVisible();
    expect(screen.getByLabelText(/who originated this request/i)).toBeVisible();
  });

  it('ignores a recipient whose grants have all gone inactive', () => {
    render(
      <Wrapper
        recipient={{
          id: 10,
          name: 'Children and Families First',
          grants: [
            {
              id: 1,
              regionId: 14,
              status: 'Inactive',
              numberWithProgramTypes: '14HP1234 - EHS',
              name: 'Children and Families First - 14HP1234 - EHS',
            },
          ],
        }}
      />
    );

    expect(screen.queryByTestId('read-only-value')).toBeNull();
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('leaves the recipient out when it is already chosen', () => {
    const recipient = { id: 10, name: 'Children and Families First', grants: [] };

    render(<Wrapper recipientOptions={[recipient]} recipient={recipient} />);

    // started from the recipient's TTA records, so the grant already names them
    expect(screen.queryByLabelText(/^recipient$/i)).toBeNull();
    expect(screen.queryByText('Children and Families First')).toBeNull();
  });

  it('offers a selector when the recipient has not been fixed', () => {
    const recipient = { id: 10, name: 'Children and Families First', grants: [] };

    render(<Wrapper recipientOptions={[recipient]} />);

    expect(screen.getByLabelText(/recipient/i)).toBeVisible();
  });

  it('chooses the only grant once, in a form that keeps unregistered values', () => {
    // such a form hands back a fresh copy of the recipient on every watch, so choosing the
    // grant on every render would never settle
    const grant = {
      id: 1,
      regionId: 14,
      status: 'Active',
      numberWithProgramTypes: '14HP1234 - EHS',
      name: 'Children and Families First - 14HP1234 - EHS',
    };
    const recipient = { id: 10, name: 'Children and Families First', grants: [grant] };

    render(
      <Wrapper
        recipientOptions={[recipient]}
        recipient={recipient}
        formOptions={{ shouldUnregister: false, defaultValues: { ...defaultValues, recipient } }}
      />
    );

    expect(screen.getByTestId('read-only-value')).toHaveTextContent(grant.name);
  });
});
