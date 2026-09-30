import { act, render, screen } from '@testing-library/react';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { MemoryRouter } from 'react-router-dom';

jest.mock('../TopAlert', () => () => null);

import Review from '../Review';

// eslint-disable-next-line react/prop-types
const FormWrapper = ({
  defaultValues,
  isNeedsAction = true,
  isApprover = false,
  isSubmitted = false,
  pages = [],
  reviewItems = [],
}) => {
  const hookForm = useForm({
    mode: 'onChange',
    defaultValues,
  });
  return (
    // eslint-disable-next-line react/jsx-props-no-spreading
    <FormProvider {...hookForm}>
      <MemoryRouter>
        <Review
          reviewItems={reviewItems}
          pages={pages}
          isPoc={false}
          onFormReview={jest.fn()}
          isApprover={isApprover}
          isAdmin={false}
          isOwner={false}
          approver={{}}
          author={{}}
          isSubmitted={isSubmitted}
          onUpdatePage={jest.fn()}
          onSaveDraft={jest.fn()}
          onSubmit={jest.fn()}
          isNeedsAction={isNeedsAction}
          reviewSubmitPagePosition={4}
        />
      </MemoryRouter>
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

  it('allows an approver to edit a submitted session section from the review page', () => {
    const defaultValues = {
      status: 'In progress',
      approver: { fullName: 'Session approver' },
    };
    const pages = [{ label: 'Session summary', onNavigation: jest.fn() }];
    const reviewItems = [
      {
        id: 'session-summary',
        title: 'Session summary',
        content: <p>Session details</p>,
      },
    ];

    act(() => {
      render(
        <FormWrapper
          defaultValues={defaultValues}
          isNeedsAction={false}
          isApprover
          isSubmitted
          pages={pages}
          reviewItems={reviewItems}
        />
      );
    });

    expect(screen.getByRole('button', { name: 'Edit Session summary' })).toBeVisible();
  });

  it('allows an approver to edit a returned session section', () => {
    const defaultValues = {
      status: 'needs_action',
      approver: { fullName: 'Session approver' },
    };
    const pages = [{ label: 'Session summary', onNavigation: jest.fn() }];
    const reviewItems = [
      {
        id: 'session-summary',
        title: 'Session summary',
        content: <p>Session details</p>,
      },
    ];

    act(() => {
      render(
        <FormWrapper
          defaultValues={defaultValues}
          isApprover
          isSubmitted
          pages={pages}
          reviewItems={reviewItems}
        />
      );
    });

    expect(screen.getByRole('button', { name: 'Edit Session summary' })).toBeVisible();
  });
});
