/* eslint-disable react/jsx-props-no-spreading */
import React from 'react';
import {
  render, screen,
} from '@testing-library/react';
import { useForm, FormProvider } from 'react-hook-form';
import userEvent from '@testing-library/user-event';
import SingleRecipientSelect from '../SingleRecipientSelect';

describe('SingleRecipientSelect', () => {
  const mockPossibleRecipients = [
    {
      label: 'Recipient 1',
      options: [
        { value: 1, label: 'Recipient 1 - Grant 1' },
        { value: 2, label: 'Recipient 1 - Grant 2' },
      ],
    },
    {
      label: 'Recipient 2',
      options: [
        { value: 3, label: 'Recipient 2 - Grant 1' },
        { value: 4, label: 'Recipient 2 - Grant 2' },
      ],
    },
  ];

  const mockSelectedGrant = mockPossibleRecipients[0];

  const RenderTest = () => {
    const hookForm = useForm();

    return (
      <FormProvider {...hookForm}>
        <SingleRecipientSelect
          control={hookForm.control}
          selectedRecipient={mockSelectedGrant}
          possibleRecipients={mockPossibleRecipients}
        />
      </FormProvider>
    );
  };

  it('renders correctly with default props', () => {
    render(<RenderTest />);
    expect(screen.getByText(/recipient name/i)).toBeInTheDocument();

    const select = screen.getByRole('combobox', { name: /recipient name required recipient 1/i });
    // Click the select.
    userEvent.click(select);

    // Check that the options are present.
    expect(screen.queryAllByText(/recipient 1 - grant 1/i)).toHaveLength(2);
    expect(screen.getByText(/recipient 1 - grant 2/i)).toBeInTheDocument();
    expect(screen.getByText(/recipient 2 - grant 1/i)).toBeInTheDocument();
    expect(screen.getByText(/recipient 2 - grant 2/i)).toBeInTheDocument();
  });
});
