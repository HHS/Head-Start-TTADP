/* eslint-disable react/jsx-props-no-spreading */
import '@testing-library/jest-dom';
import {
  render, screen, waitFor, within,
} from '@testing-library/react';
import moment from 'moment';
import reactSelectEvent from 'react-select-event';
import React from 'react';
import userEvent from '@testing-library/user-event';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import { FormProvider, useForm } from 'react-hook-form/dist/index.ie11';
import UserContext from '../../../../../UserContext';
import NetworkContext from '../../../../../NetworkContext';

import ReviewSubmit from '../index';
import { REPORT_STATUSES } from '../../../../../Constants';

const availableApprovers = [
  { id: 1, name: 'approver 1' },
  { id: 2, name: 'approver 2' },
];

const reportCreator = {
  name: 'Walter Burns',
  role: ['Reporter'],
};

const user = {
  name: 'test@test.com',
  permissions: [
    {
      scopeId: 3,
      regionId: 1,
    },
  ],
};

const approversToPass = [{ id: 1, status: null, User: { id: 1, fullName: 'approver 1' } }];

const RenderReview = ({
  // eslint-disable-next-line react/prop-types
  allComplete, formData, onSubmit, onReview, onResetToDraft, isApprover, isPendingApprover, pages,
}) => {
  const hookForm = useForm({
    mode: 'onChange',
    defaultValues: { ...formData },
  });

  return (
    <FormProvider {...hookForm}>
      <ReviewSubmit
        allComplete={allComplete}
        onSubmit={onSubmit}
        reviewItems={[]}
        availableApprovers={availableApprovers}
        formData={formData}
        onReview={onReview}
        onResetToDraft={onResetToDraft}
        onSaveForm={() => { }}
        isApprover={isApprover}
        isPendingApprover={isPendingApprover}
        pages={pages}
        reportCreator={reportCreator}
        updateShowValidationErrors={jest.fn}
        lastSaveTime={moment()}
      />
    </FormProvider>
  );
};

const completePages = [{
  label: 'label',
  state: 'Complete',
  review: false,
}];

const incompletePages = [{
  label: 'incomplete',
  state: 'In progress',
  review: false,
}];

const renderReview = (
  allComplete,
  isApprover = false,
  isPendingApprover = false,
  calculatedStatus = REPORT_STATUSES.DRAFT,
  formData = {
    additionalNotes: '',
  },
  onSubmit = jest.fn(),
  onReview = jest.fn(),
  onResetToDraft = jest.fn(),
  complete = true,
  approvers = null,
) => {
  const history = createMemoryHistory();
  const pages = complete ? completePages : incompletePages;

  render(
    <Router history={history}>
      <UserContext.Provider value={{ user }}>
        <NetworkContext.Provider value={{ connectionActive: true, localStorageAvailable: true }}>
          <RenderReview
            allComplete={allComplete}
            onSubmit={onSubmit}
            onResetToDraft={onResetToDraft}
            formData={{
              ...formData, calculatedStatus, submissionStatus: calculatedStatus, author: { name: 'user' }, approvers, id: 1, displayId: '1',
            }}
            isApprover={isApprover}
            isPendingApprover={isPendingApprover}
            onReview={onReview}
            pages={pages}
          />
        </NetworkContext.Provider>
      </UserContext.Provider>
    </Router>,
  );
  return history;
};

const selectLabel = 'Approving manager (Required)';

describe('ReviewSubmit', () => {
  describe('when the user is the approving manager', () => {
    it('shows the manager UI', async () => {
      const allComplete = true;
      const isApprover = true;
      const isPendingApprover = true;
      const calculatedStatus = REPORT_STATUSES.SUBMITTED;

      renderReview(allComplete, isApprover, isPendingApprover, calculatedStatus);
      const header = await screen.findByText('Review and approve report');
      expect(header).toBeVisible();
    });

    it('allows the manager to review the report', async () => {
      const allComplete = true;
      const isApprover = true;
      const isPendingApprover = true;
      const calculatedStatus = REPORT_STATUSES.SUBMITTED;
      const formData = { additionalNotes: '' };
      const onSubmit = jest.fn();
      const onReview = jest.fn();

      renderReview(
        allComplete, isApprover, isPendingApprover, calculatedStatus, formData, onSubmit, onReview,
      );
      userEvent.selectOptions(screen.getByTestId('dropdown'), ['approved']);
      const reviewButton = await screen.findByRole('button');
      userEvent.click(reviewButton);
      await waitFor(() => expect(onReview).toHaveBeenCalled());
    });

    it('the review button handles errors', async () => {
      const allComplete = true;
      const isApprover = true;
      const isPendingApprover = false;
      const calculatedStatus = REPORT_STATUSES.SUBMITTED;
      const formData = { additionalNotes: '' };
      const onSubmit = jest.fn();
      const onReview = jest.fn();

      onReview.mockImplementation(() => {
        throw new Error();
      });

      renderReview(
        allComplete, isApprover, isPendingApprover, calculatedStatus, formData, onSubmit, onReview,
      );
      userEvent.selectOptions(screen.getByTestId('dropdown'), ['approved']);
      const reviewButton = await screen.findByRole('button');
      userEvent.click(reviewButton);
      const error = await screen.findByText('Unable to review report');
      expect(error).toBeVisible();
    });
  });

  describe('when the form is not complete', () => {
    it('an error message is shown when the report is submitted', async () => {
      const allComplete = false;
      const isApprover = false;
      const isPendingApprover = false;

      renderReview(allComplete, isApprover, isPendingApprover);
      const button = await screen.findByRole('button', { name: 'Submit for approval' });
      userEvent.click(button);
      const error = await screen.findByTestId('errorMessage');
      expect(error).toBeVisible();
    });
  });

  describe('when the form is complete', () => {
    it('no modal is shown', async () => {
      const allComplete = true;
      const isApprover = false;

      renderReview(allComplete, isApprover);
      const alert = screen.queryByTestId('alert');
      expect(alert).toBeNull();
      await waitFor(() => expect(screen.getByLabelText(selectLabel)).toBeEnabled());
    });

    it('the submit button calls onSubmit', async () => {
      const allComplete = true;
      const isApprover = false;
      const isPendingApprover = false;
      const calculatedStatus = REPORT_STATUSES.DRAFT;
      const formData = { additionalNotes: '' };
      const onSubmit = jest.fn();
      const onReview = jest.fn();
      const onResetToDraft = jest.fn();
      const complete = true;

      renderReview(allComplete, isApprover, isPendingApprover, calculatedStatus,
        formData, onSubmit, onReview, onResetToDraft, complete, approversToPass);
      const button = await screen.findByRole('button', { name: 'Submit for approval' });
      expect(button).toBeEnabled();
      userEvent.click(button);
      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    });

    it('the submit button handles errors', async () => {
      const allComplete = true;
      const isApprover = false;
      const isPendingApprover = false;
      const calculatedStatus = REPORT_STATUSES.DRAFT;
      const formData = {};
      const onReview = jest.fn();
      const onResetToDraft = jest.fn();
      const complete = true;

      const onSubmit = jest.fn();
      onSubmit.mockImplementation(() => {
        throw new Error();
      });

      renderReview(allComplete, isApprover, isPendingApprover, calculatedStatus,
        formData, onSubmit, onReview, onResetToDraft, complete, approversToPass);
      const button = await screen.findByRole('button', { name: 'Submit for approval' });
      expect(button).toBeEnabled();
      userEvent.click(button);
      const error = await screen.findByText('Unable to submit report');
      expect(error).toBeVisible();
    });
  });

  it('Once submitted, user is redirected', async () => {
    const allComplete = true;
    const isApprover = false;
    const isPendingApprover = false;
    const calculatedStatus = REPORT_STATUSES.DRAFT;
    const formData = {};
    const onSubmit = jest.fn();
    const onReview = jest.fn();
    const onResetToDraft = jest.fn();
    const complete = true;

    const history = renderReview(allComplete, isApprover, isPendingApprover, calculatedStatus,
      formData, onSubmit, onReview, onResetToDraft, complete, approversToPass);
    userEvent.click(await screen.findByRole('button', { name: 'Submit for approval' }));
    await waitFor(() => expect(history.location.pathname).toBe('/activity-reports'));
  });

  it('initializes the form with "initialData"', async () => {
    const allComplete = true;
    const isApprover = false;
    const isPendingApprover = false;
    const calculatedStatus = REPORT_STATUSES.DRAFT;

    renderReview(allComplete, isApprover, isPendingApprover, calculatedStatus);
    const information = await screen.findByRole('group', { name: /review and submit report/i });
    const approver = within(information).getByLabelText(/approving manager/i);
    reactSelectEvent.openMenu(approver);
    expect(await screen.findByText(/approver 1/i)).toBeVisible();
    expect(await screen.findByText(/approver 2/i)).toBeVisible();
  });

  it('reset button works', async () => {
    const allComplete = true;
    const isApprover = false;
    const isPendingApprover = false;
    const calculatedStatus = REPORT_STATUSES.SUBMITTED;
    const formData = {};
    const onSubmit = jest.fn();
    const onReview = jest.fn();
    const mockReset = jest.fn();
    const complete = false;

    renderReview(allComplete, isApprover, isPendingApprover, calculatedStatus,
      formData, onSubmit, onReview, mockReset, complete, approversToPass);

    const resetDraftButton = await screen.findByRole('button', { name: /reset to draft/i });
    userEvent.click(resetDraftButton);
    await waitFor(() => expect(mockReset).toHaveBeenCalled());
  });

  it('reset button handles errors', async () => {
    const allComplete = true;
    const isApprover = false;
    const isPendingApprover = false;
    const calculatedStatus = REPORT_STATUSES.SUBMITTED;
    const formData = {};
    const onSubmit = jest.fn();
    const onReview = jest.fn();
    const mockReset = jest.fn();
    mockReset.mockImplementation(() => {
      throw new Error();
    });

    const complete = true;

    renderReview(allComplete, isApprover, isPendingApprover, calculatedStatus,
      formData, onSubmit, onReview, mockReset, complete, approversToPass);

    const resetDraftButton = await screen.findByRole('button', { name: /reset to draft/i });
    userEvent.click(resetDraftButton);
    await waitFor(() => expect(mockReset).toHaveBeenCalled());
    expect(await screen.findByText(/unable to reset activity report to draft/i)).toBeVisible();
  });
});
