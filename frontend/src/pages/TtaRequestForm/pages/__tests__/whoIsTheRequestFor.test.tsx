import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { defaultValues } from '../../constants';
import { WhoIsTheRequestForFields } from '../whoIsTheRequestFor';

function Wrapper(props) {
  const hookForm = useForm({ mode: 'onBlur', defaultValues });
  return (
    // eslint-disable-next-line react/jsx-props-no-spreading
    <FormProvider {...hookForm}>
      {/* eslint-disable-next-line react/jsx-props-no-spreading */}
      <WhoIsTheRequestForFields {...props} />
    </FormProvider>
  );
}

describe('WhoIsTheRequestForFields', () => {
  it('asks nothing about grants until there is a recipient to ask about', () => {
    render(<Wrapper />);

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

  it('shows the recipient as fixed text rather than a selector when it is already chosen', () => {
    const recipient = { id: 10, name: 'Children and Families First', grants: [] };

    render(<Wrapper recipientOptions={[recipient]} recipient={recipient} />);

    // started from the recipient's TTA records, so there is nothing to choose between
    expect(screen.queryByLabelText(/^recipient$/i)).toBeNull();
    expect(screen.getByText('Children and Families First')).toBeVisible();
  });

  it('offers a selector when the recipient has not been fixed', () => {
    const recipient = { id: 10, name: 'Children and Families First', grants: [] };

    render(<Wrapper recipientOptions={[recipient]} />);

    expect(screen.getByLabelText(/recipient/i)).toBeVisible();
  });
});
