import { act, render, screen } from '@testing-library/react';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import AppLoadingContext from '../../../../AppLoadingContext';
import UserContext from '../../../../UserContext';
import ReviewSubmit from '../ReviewSubmit';

// Avoid rendering Review/TopAlert (which read additional form context not
// relevant to these tests). We only care about ReviewSubmit's own logic for
// computing `isSubmitted` and propagating it via the hidden reviewStatus
// input + the isSubmitted prop passed to Review.
jest.mock('../Review', () => {
  const PropTypes = jest.requireActual('prop-types');
  const ReviewMock = ({ isSubmitted, isApprover, isNeedsAction }) => (
    <div
      data-testid="review-mock"
      data-is-submitted={String(isSubmitted)}
      data-is-approver={String(isApprover)}
      data-is-needs-action={String(isNeedsAction)}
    />
  );
  ReviewMock.propTypes = {
    isSubmitted: PropTypes.bool.isRequired,
    isApprover: PropTypes.bool.isRequired,
    isNeedsAction: PropTypes.bool.isRequired,
  };
  return ReviewMock;
});

// eslint-disable-next-line react/prop-types
const FormWrapper = ({ defaultValues, error = null, user = { id: 1, name: 'Test User' } }) => {
  const hookForm = useForm({
    mode: 'onChange',
    defaultValues,
  });

  return (
    <AppLoadingContext.Provider value={{ setIsAppLoading: jest.fn() }}>
      <UserContext.Provider value={{ user }}>
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

  it('marks a POC-created NC-flow session as submitted (mirrors model semantics)', () => {
    // The hidden reviewStatus input is driven by the local isSubmitted check.
    // For a POC-created NC-flow session with collabComplete + approverId set,
    // the model treats this as submitted; the component must agree, or the
    // submit/approve UI diverges from backend state.
    const approverId = 9;
    const defaultValues = {
      additionalNotes: '',
      approver: { fullName: 'Jane Doe' },
      approverId,
      status: 'In progress',
      pocComplete: true,
      collabComplete: true,
      ownerComplete: false,
      facilitation: 'national_center',
      event: {
        pocIds: [1],
        ownerId: 99,
        data: { eventOrganizer: 'Regional PD Event (with National Centers)' },
      },
    };

    act(() => {
      render(
        <FormWrapper
          defaultValues={defaultValues}
          user={{ id: approverId, name: 'Approver User' }}
        />
      );
    });

    expect(document.getElementById('reviewStatus').value).toBe('submitted');
    const reviewMock = screen.getByTestId('review-mock');
    expect(reviewMock.dataset.isSubmitted).toBe('true');
    expect(reviewMock.dataset.isApprover).toBe('true');
  });

  it('does not mark the session as submitted when approverId is not set (draft)', () => {
    const defaultValues = {
      additionalNotes: '',
      approver: { fullName: '' },
      approverId: null,
      status: 'In progress',
      pocComplete: true,
      collabComplete: true,
      facilitation: 'national_center',
      event: {
        pocIds: [1],
        ownerId: 99,
        data: { eventOrganizer: 'Regional PD Event (with National Centers)' },
      },
    };

    act(() => {
      render(<FormWrapper defaultValues={defaultValues} />);
    });

    expect(document.getElementById('reviewStatus').value).toBe('draft');
    expect(screen.getByTestId('review-mock').dataset.isSubmitted).toBe('false');
  });
});
