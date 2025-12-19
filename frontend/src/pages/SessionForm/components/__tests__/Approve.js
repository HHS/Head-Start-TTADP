import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import Approve from '../Approve';

// eslint-disable-next-line react/prop-types
const FormWrapper = ({ defaultValues }) => {
  const hookForm = useForm({
    mode: 'onChange',
    defaultValues,
  });

  return (
    // eslint-disable-next-line react/jsx-props-no-spreading
    <FormProvider {...hookForm}>
      <Approve
        reviewItems={[]}
        pages={[]}
        isPoc={false}
        onFormReview={jest.fn()}
        isApprover={false}
        isAdmin={false}
        approver={{}}
        author={{}}
        isSubmitted={false}
        onUpdatePage={jest.fn()}
        onSaveDraft={jest.fn()}
        onSubmit={jest.fn()}
        isNeedsAction={false}
        reviewSubmitPagePosition={4}
      />
    </FormProvider>
  );
};

describe('Approve', () => {
  it('renders with missing approver name', async () => {
    const mockOnSubmit = jest.fn();
    const defaultValues = {
      additionalNotes: '',
      managerNotes: 'Please update the report with more details.',
      approver: null,
      status: 'Needs Action',
    };

    act(() => {
      render(<FormWrapper defaultValues={defaultValues} onSubmit={mockOnSubmit} />);
    });

    expect(await screen.findByTestId('session-form-approver')).toBeVisible();
    expect(screen.getByText('Add manager notes')).toBeVisible();
  });
});
