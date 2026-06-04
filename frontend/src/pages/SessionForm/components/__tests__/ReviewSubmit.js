import { act, render, screen } from '@testing-library/react';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import AppLoadingContext from '../../../../AppLoadingContext';
import UserContext from '../../../../UserContext';
import ReviewSubmit from '../ReviewSubmit';

// eslint-disable-next-line react/prop-types
const FormWrapper = ({ defaultValues, error = null }) => {
  const hookForm = useForm({
    mode: 'onChange',
    defaultValues,
  });

  return (
    <AppLoadingContext.Provider value={{ setIsAppLoading: jest.fn() }}>
      <UserContext.Provider value={{ user: { id: 1, name: 'Test User' } }}>
        {/* eslint-disable-next-line react/jsx-props-no-spreading */}
        <FormProvider {...hookForm}>
          <ReviewSubmit
            onReview={jest.fn()}
            formData={defaultValues}
            error={error}
            onUpdatePage={jest.fn()}
            onSaveDraft={jest.fn()}
            onSubmit={jest.fn()}
            pages={[]}
            reviewSubmitPagePosition={4}
          />
        </FormProvider>
      </UserContext.Provider>
    </AppLoadingContext.Provider>
  );
};

describe('ReviewSubmit', () => {
  it('Displays error', async () => {
    const defaultValues = {
      additionalNotes: '',
      managerNotes: 'Please update the report with more details.',
      approver: { fullName: 'Jane Doe' },
      status: 'Needs Action',
    };

    act(() => {
      render(<FormWrapper defaultValues={defaultValues} error="There was an error" />);
    });

    expect(await screen.findByText('There was an error')).toBeVisible();
  });
});
