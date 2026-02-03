import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import ReviewSubmit from '../ReviewSubmit';
import UserContext from '../../../../UserContext';
import AppLoadingContext from '../../../../AppLoadingContext';

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
