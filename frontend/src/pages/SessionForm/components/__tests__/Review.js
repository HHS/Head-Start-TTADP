import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import Review from '../Review';

// eslint-disable-next-line react/prop-types
const FormWrapper = ({ defaultValues, isNeedsAction = true }) => {
  const hookForm = useForm({
    mode: 'onChange',
    defaultValues,
  });

  return (
    // eslint-disable-next-line react/jsx-props-no-spreading
    <FormProvider {...hookForm}>
      <Review
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
        isNeedsAction={isNeedsAction}
        reviewSubmitPagePosition={4}
      />
    </FormProvider>
  );
};

describe('Review', () => {
  it('Displays needs action component', async () => {
    const defaultValues = {
      additionalNotes: '',
      managerNotes: 'Please update the report with more details.',
      approver: { fullName: 'Jane Doe' },
      status: 'Needs Action',
    };

    act(() => {
      render(<FormWrapper defaultValues={defaultValues} isNeedsAction />);
    });

    expect(await screen.findByTestId('session-form-needs-action')).toBeVisible();
  });
});
