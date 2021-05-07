/* eslint-disable react/jsx-props-no-spreading */
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import userEvent from '@testing-library/user-event';
import { Router } from 'react-router';
import { createMemoryHistory } from 'history';
import { FormProvider, useForm } from 'react-hook-form/dist/index.ie11';

import ReviewSubmit from '../index';
import { REPORT_STATUSES } from '../../../../../Constants';

const approvers = [
  { id: 1, name: 'user 1' },
  { id: 2, name: 'user 2' },
];

const reportCreator = {
  name: 'Walter Burns',
  role: ['Reporter'],
};

const RenderReview = ({
  // eslint-disable-next-line react/prop-types
  allComplete, formData, onSubmit, onReview, approvingManagerId, approvingManager, pages,
}) => {
  const hookForm = useForm({
    mode: 'onChange',
    defaultValues: { ...formData, approvingManagerId },
  });

  return (
    <FormProvider {...hookForm}>
      <ReviewSubmit
        allComplete={allComplete}
        onSubmit={onSubmit}
        reviewItems={[]}
        approvers={approvers}
        formData={formData}
        onReview={onReview}
        onResetToDraft={() => {}}
        onSaveForm={() => {}}
        approvingManager={approvingManager}
        pages={pages}
        reportCreator={reportCreator}
        updateShowValidationErrors={() => {}}
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
  approvingManager = false,
  status = REPORT_STATUSES.DRAFT,
  formData = { additionalNotes: '' },
  onSubmit = () => {},
  onReview = () => {},
  approvingManagerId = null,
  complete = true,
) => {
  const history = createMemoryHistory();
  const pages = complete ? completePages : incompletePages;

  render(
    <Router history={history}>
      <RenderReview
        allComplete={allComplete}
        onSubmit={onSubmit}
        formData={{
          ...formData, status, author: { name: 'user' }, id: 1, displayId: '1',
        }}
        approvingManager={approvingManager}
        onReview={onReview}
        approvingManagerId={approvingManagerId}
        pages={pages}
      />
    </Router>,
  );
  return history;
};

const selectLabel = 'Approving manager (Required)';

describe('ReviewSubmit', () => {
  describe('when the user is the approving manager', () => {
    it('shows the manager UI', async () => {
      renderReview(true, true, REPORT_STATUSES.SUBMITTED);
      const header = await screen.findByText('Review and approve report');
      expect(header).toBeVisible();
    });

    it('allows the manager to review the report', async () => {
      const onReview = jest.fn();
      renderReview(true, true, REPORT_STATUSES.SUBMITTED, { additionalNotes: '' }, () => {}, onReview);
      userEvent.selectOptions(screen.getByTestId('dropdown'), ['approved']);
      const reviewButton = await screen.findByRole('button');
      userEvent.click(reviewButton);
      await waitFor(() => expect(onReview).toHaveBeenCalled());
    });

    it('the review button handles errors', async () => {
      const onReview = jest.fn();
      onReview.mockImplementation(() => {
        throw new Error();
      });

      renderReview(true, true, REPORT_STATUSES.SUBMITTED, { additionalNotes: '' }, () => {}, onReview);
      userEvent.selectOptions(screen.getByTestId('dropdown'), ['approved']);
      const reviewButton = await screen.findByRole('button');
      userEvent.click(reviewButton);
      const error = await screen.findByText('Unable to review report');
      expect(error).toBeVisible();
    });
  });

  describe('when the form is not complete', () => {
    it('an error message is shown when the report is submitted', async () => {
      renderReview(false, false);
      const button = await screen.findByRole('button', { name: 'Submit for approval' });
      userEvent.click(button);
      const error = await screen.findByTestId('errorMessage');
      expect(error).toBeVisible();
    });
  });

  describe('when the form is complete', () => {
    it('no modal is shown', async () => {
      renderReview(true, false);
      const alert = screen.queryByTestId('alert');
      expect(alert).toBeNull();
      await waitFor(() => expect(screen.getByLabelText(selectLabel)).toBeEnabled());
    });

    it('the submit button calls onSubmit', async () => {
      const onSubmit = jest.fn();
      renderReview(true, false, REPORT_STATUSES.DRAFT, {}, onSubmit, () => {}, 1);
      const button = await screen.findByRole('button', { name: 'Submit for approval' });
      expect(button).toBeEnabled();
      userEvent.click(button);
      await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    });

    it('the submit button handles errors', async () => {
      const onSubmit = jest.fn();
      onSubmit.mockImplementation(() => {
        throw new Error();
      });

      renderReview(true, false, REPORT_STATUSES.DRAFT, {}, onSubmit, () => {}, 1);
      const button = await screen.findByRole('button', { name: 'Submit for approval' });
      expect(button).toBeEnabled();
      userEvent.click(button);
      const error = await screen.findByText('Unable to submit report');
      expect(error).toBeVisible();
    });
  });

  it('Once submitted, user is redirected', async () => {
    const history = renderReview(true, false, REPORT_STATUSES.DRAFT, {}, () => {}, () => {}, 1);
    userEvent.click(await screen.findByRole('button', { name: 'Submit for approval' }));

    await waitFor(() => expect(history.location.pathname).toBe('/activity-reports'));
  });

  it('initializes the form with "initialData"', async () => {
    renderReview(true, false, REPORT_STATUSES.DRAFT, { }, () => {}, () => {}, 1);
    const selectBox = await screen.findByLabelText('Approving manager (Required)');
    await waitFor(() => expect(selectBox).toHaveValue('1'));
  });
});
